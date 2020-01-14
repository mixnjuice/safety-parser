import globby from 'globby';
import pdfParse from 'pdf-parse';
import { titleCase } from 'title-case';

import {
  categories,
  ingredients,
  vendorKeys,
  vendorRegexes
} from 'modules/constants';
import { getLogger } from 'modules/logging';

const log = getLogger('parser');

const printAll = array => {
  array.sort();

  for (const item of array) {
    log.info(item);
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

    if (flavorMatches) {
      flavorName = `${flavorMatches[1]}${flavorMatches[2]}`;
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
      log.debug(`${dir} ${flavorName} has ${name}!`);
      results[category].push(`${dir},${flavorName},${name}`);
    }
  }
};

const parseDirectory = async (vendor, results) => {
  const fileRegex = vendorRegexes[vendor];
  const files = await globby(`./data/${vendor}/**/*.pdf`);
  const tasks = [];

  log.info(`Parsing directory ${vendor}`);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    log.debug(`Scanning ${file}`);
    tasks.push(
      pdfParse(file)
        .then(text => parseFile(vendor, file, fileRegex, text, results))
        .catch(error => log.error(error))
    );

    if (tasks.length === 100) {
      await Promise.all(tasks);
      tasks.length = 0;
    }
  }

  await Promise.all(tasks);
  tasks.length = 0;
};

export const parseAllDirectories = async () => {
  const results = Object.fromEntries(
    Object.entries(categories).map(([key]) => [key, []])
  );

  for (const vendor of vendorKeys.filter(key => key === 'CAP')) {
    await parseDirectory(vendor, results);
  }

  const { avoid, caution, research } = results;

  log.info('AVOID FLAVORS');
  printAll(avoid);
  log.info('CAUTION FLAVORS');
  printAll(caution);
  log.info('RESEARCH FLAVORS');
  printAll(research);
};
