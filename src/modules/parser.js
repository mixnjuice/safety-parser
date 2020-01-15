import globby from 'globby';
import inquirer from 'inquirer';
import pdfParse from 'pdf-parse';
import { titleCase } from 'title-case';

import { ingredients, vendorKeys, vendorRegexes } from 'modules/constants';
import {
  findFlavor,
  querySingle,
  getCategoryByName,
  getIngredientByCasNumber,
  insertFlavorIngredient,
  getFlavorIngredient,
  queryMultiple
} from 'modules/database';
import { getLogger } from 'modules/logging';

const log = getLogger('parser');

export const mergeResults = async results => {
  log.info(`Merging ${results.length} new findings...`);

  for (const result of results) {
    const { category, vendor, flavor, ingredient } = result;

    const dbCategory = await querySingle(getCategoryByName(category));

    if (!dbCategory) {
      log.warn(`Did not find ingredient category ${category}`);
      continue;
    }

    const dbFlavors = await queryMultiple(findFlavor(flavor, vendor));

    let flavorId;

    if (!Array.isArray(dbFlavors) || dbFlavors.length === 0) {
      log.warn(`Did not find ${vendor} ${flavor}`);
      continue;
    } else if (dbFlavors.length > 1) {
      const chosen = await inquirer.prompt([
        {
          type: 'list',
          name: 'flavorId',
          message: `Multiple flavors found for ${vendor} ${flavor}`,
          choices: dbFlavors.map(dbFlavor => ({
            name: `${dbFlavor.vendorCode} ${dbFlavor.name}`,
            value: dbFlavor.id
          }))
        }
      ]);

      flavorId = chosen.flavorId;
    } else {
      flavorId = dbFlavors[0].id;
    }

    log.info(`Matched ${flavor} to flavor ${flavorId}`);

    const dbIngredient = await querySingle(
      getIngredientByCasNumber(ingredient)
    );

    if (!dbIngredient) {
      log.warn(`Did not find ingredient ${ingredient}`);
      continue;
    }

    const flavorIngredient = await querySingle(
      getFlavorIngredient(flavorId, dbIngredient.id)
    );

    if (flavorIngredient) {
      log.info('Found existing flavors_ingredients');
      continue;
    }

    await insertFlavorIngredient(flavorId, dbIngredient.id);
  }
};

const parseFile = (dir, file, fileRegex, data, results) => {
  if (!data.text) {
    return;
  }

  const { text } = data;

  let flavorName = file;

  if (dir === 'CAP') {
    const startIdx = text.indexOf('Material name:') + 14;

    let endIdx = text.indexOf('\n', startIdx);

    // dumb hack
    if (endIdx === -1) {
      endIdx = text
        .split(/./)
        .findIndex(
          (value, index) => /MCT|TYPE|CA\d*/.test(value) && index >= startIdx
        );
    }
    const rawName = text.substring(startIdx, endIdx);

    flavorName = titleCase(
      rawName
        .replace(
          /Artificial|N&A|Nat & Art|Natural & Artificial|Flavor|Wonf($|\s)|Fl($|\s)|Nat($|\s)|Art($|\s)|Type($|\s)/gi,
          ''
        )
        .replace(/\s{2,}/g, ' ')
        .toLowerCase()
        .trim()
    );
  } else if (dir === 'TPA') {
    let endIdx = text.lastIndexOf('Product:\n');

    if (endIdx === -1) {
      endIdx = text.lastIndexOf('Product Name:');
    }

    let startIdx = text.lastIndexOf('\n', endIdx);

    let rawName = text.substring(startIdx, endIdx);

    if (rawName.trim() === '') {
      endIdx = startIdx;
      startIdx = text.lastIndexOf('\n', startIdx);
      rawName = text.substring(startIdx, endIdx);
    }

    flavorName = titleCase(
      rawName
        .replace(/\s\d+$/, '')
        .toLowerCase()
        .trim()
    );

    if (flavorName === 'This' || flavorName.trim().length === 0) {
      flavorName = file;
    }
  } else if (dir === 'MB') {
    const flavorMatches = file.match(fileRegex);

    if (flavorMatches) {
      flavorName = flavorMatches[1].trim().replace('-', ' ');
    }
  } else if (dir === 'FW') {
    const flavorMatches = file.match(fileRegex);

    if (flavorMatches && flavorMatches.length > 3) {
      flavorName = flavorMatches[3]
        .replace(/(Flavor|N&A|Artificial|Type)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else {
      log.warn(`Unable to parse FW flavor name from ${file}`);
    }
  } else {
    const flavorMatches = file.match(fileRegex);

    if (flavorMatches) {
      flavorName = flavorMatches[1].trim();
    }
  }

  if (dir === 'FLV' || dir === 'MB' || dir === 'VTA') {
    flavorName = titleCase(
      flavorName
        .replace(/[-_]+/g, ' ')
        .toLowerCase()
        .trim()
    );
  } else if (dir === 'INW') {
    flavorName = flavorName.replace('Conc.', '').trim();
  }

  log.debug(`Parsed ${file} as ${flavorName}`);
  for (const [cas, info] of Object.entries(ingredients)) {
    const { category, name } = info;
    const trimmedText = text.replace(/[\r\n]/, '').toLowerCase();
    const hasIngredient = trimmedText.indexOf(cas) > -1;

    if (hasIngredient) {
      log.info(`${dir} ${flavorName} has ${name}!`);
      results.push({
        category,
        vendor: dir,
        flavor: flavorName,
        ingredient: cas
      });
    }
  }
};

const parseDirectory = async vendor => {
  const fileRegex = vendorRegexes[vendor];
  const files = await globby(`./data/${vendor}/**/*.pdf`);
  const results = [];
  const tasks = [];

  log.info(`Parsing directory ${vendor}`);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    log.debug(`Scanning ${file}`);
    tasks.push(
      pdfParse(file)
        .then(text => parseFile(vendor, file, fileRegex, text, results))
        .catch(error => log.error(error.message))
    );

    if (tasks.length === 100) {
      await Promise.all(tasks);
      tasks.length = 0;
    }
  }

  await Promise.all(tasks);
  tasks.length = 0;

  await mergeResults(results);
};

export const parseAllDirectories = async () => {
  for (const vendor of vendorKeys) {
    await parseDirectory(vendor);
  }
};
