import globby from 'globby';
import mkdirp from 'mkdirp';
import neatCsv from 'neat-csv';
import inquirer from 'inquirer';
import pdfParse from 'pdf-parse';
import getStream from 'get-stream';
import { titleCase } from 'title-case';
import { dirname, resolve } from 'path';
import { createReadStream, copyFileSync, existsSync } from 'fs';
import { compareTwoStrings } from 'string-similarity';

import { vendorKeys, vendorRegexes } from 'modules/constants';
import {
  findFlavor,
  getCategoryByName,
  getFlavorIngredient,
  getIdentifiers,
  getIngredientByCasNumber,
  getIngredients,
  insertFlavorIngredient,
  queryMultiple,
  querySingle
} from 'modules/database';
import { getLogger } from 'modules/logging';

const log = getLogger('parser');

export const readManualWarnings = async () => {
  const stream = await createReadStream(
    resolve(__dirname, '../../data/manual.csv')
  );
  const data = await getStream(stream);

  return await neatCsv(data);
};

export const parseManualWarnings = async () => {
  const warnings = await readManualWarnings();

  for (const warning of warnings) {
    const { vendor, flavor, ingredient } = warning;
    const identifiers = await querySingle(
      getIdentifiers(vendor, flavor, ingredient)
    );

    if (!identifiers) {
      continue;
    }

    const { flavorId, ingredientId } = identifiers;

    const flavorIngredient = await querySingle(
      getFlavorIngredient(flavorId, ingredientId)
    );

    if (flavorIngredient) {
      log.info('Found existing flavors_ingredients');
      return;
    }

    await insertFlavorIngredient(flavorId, ingredientId);
  }
};

export const mergeResults = async results => {
  log.info(`Merging ${results.length} new findings...`);

  for (const result of results) {
    const { category, vendor, flavor, casNumber } = result;

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
      const choices = [
        ...dbFlavors.map(dbFlavor => ({
          name: `${dbFlavor.vendorCode} ${dbFlavor.name}`,
          value: dbFlavor.id
        }))
      ];
      const name = `${vendor} ${flavor}`;
      const exactMatch = choices.find(choice => choice.name === name);

      if (exactMatch) {
        flavorId = exactMatch.value;
        log.info(`Matched ${name} to ${flavorId}`);
      } else {
        choices.sort((a, b) => {
          const aValue = compareTwoStrings(name, a.name);
          const bValue = compareTwoStrings(name, b.name);

          if (aValue === bValue) {
            return 0;
          }

          return aValue > bValue ? -1 : 1;
        });

        const chosen = await inquirer.prompt([
          {
            type: 'list',
            name: 'flavorId',
            message: `Multiple flavors found for ${vendor} ${flavor}`,
            choices: [
              ...choices,
              {
                name: 'None of these',
                value: null
              }
            ]
          }
        ]);

        if (chosen.flavorId === null) {
          log.warn(`Skipping ${vendor} ${flavor}!`);
          continue;
        }

        flavorId = chosen.flavorId;
      }
    } else {
      flavorId = dbFlavors[0].id;
    }

    log.info(`Matched ${flavor} to flavor ${flavorId}`);

    const dbIngredient = await querySingle(getIngredientByCasNumber(casNumber));

    if (!dbIngredient) {
      log.warn(`Did not find ingredient ${casNumber}`);
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

const parseFile = (dir, file, fileRegex, data, results, ingredients) => {
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
    flavorName = flavorName.replace(/(Conc.|Concentrate)/i, '').trim();
  } else if (dir === 'WF') {
    flavorName = flavorName.replace(/-/g, ' ');
  }

  log.debug(`Parsed ${file} as ${flavorName}`);

  const flavorSlug = `${dir}-${flavorName.replace(/[^\w\d\s]/g, '')}`
    .replace(/\s+/g, '-')
    .toLowerCase();
  const newFile = `./data-new/${dir}/${flavorSlug}.pdf`;

  if (!existsSync(newFile)) {
    mkdirp.sync(dirname(newFile));
    copyFileSync(file, newFile);
    log.info(`Copied ${file} to ${newFile}`);
  }

  for (const ingredient of ingredients) {
    const { category, casNumber, name } = ingredient;
    const trimmedText = text.replace(/[\r\n]/, '').toLowerCase();
    const hasIngredient = trimmedText.indexOf(casNumber) > -1;

    if (hasIngredient) {
      log.info(`${dir} ${flavorName} has ${name}!`);
      results.push({
        category,
        casNumber,
        vendor: dir,
        flavor: flavorName
      });
    }
  }
};

const parseDirectory = async (vendor, ingredients) => {
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
        .then(text =>
          parseFile(vendor, file, fileRegex, text, results, ingredients)
        )
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
  const ingredients = await queryMultiple(getIngredients());

  for (const vendor of vendorKeys) {
    await parseDirectory(vendor, ingredients);
  }

  await parseManualWarnings();
};
