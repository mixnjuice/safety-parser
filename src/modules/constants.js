export const vendorKeys = [
  'FW',
  'RF',
  'CAP',
  'FLV',
  'WF',
  'TPA',
  'MB',
  'INW',
  'VTA',
  'FA',
  'FM',
  'HS',
  'NR'
];

export const vendorRegexes = {
  FW: /(FW-([A-Z0-9]+))?\s*([\w\d\s'&\\(\\)-]+?)\s+FW-(?:[A-Z0-9]+)\.pdf$/i,
  RF: /([\w\d\s]+)[_,] Super Concentrate/,
  CAP: /[\w\s]+_([\w\d\s]*)_SDS[-_]US.*/,
  FLV: /([\w\d-]+)(?!-Flavor)-MSDS/i,
  WF: /^Natural and Artificial ([\w\d\s]+) Flavour Liquid\.pdf$/,
  TPA: null,
  MB: /\/([\w\d\s!-]+)\.pdf/,
  INW: /[0-9]{4}\s(.*)\.pdf/,
  VTA: /SDS-VTA-(.*)\.pdf/,
  FA: /FA[0-9]+_(.*)_.*\.pdf/,
  FM: /[0-9]+\s(.*)\sflavour.*/i,
  HS: /[0-9]+\s(.*)\.pdf/,
  NR: /(\w\d\s)+\s—\sNicRiv SDS\.pdf/
};

export const categories = {
  avoid: 'Avoid',
  caution: 'Caution',
  research: 'Research'
};

const { avoid, caution, research } = categories;

export const ingredients = {
  '57-48-7': { category: caution, name: 'Fructose' },
  '8052-35-5': { category: caution, name: 'Molasses' },
  '56038-13-2': { category: avoid, name: 'Sucralose' },
  '7647-14-5': { category: caution, name: 'Sodium Chloride' },
  '98-01-1': { category: research, name: 'Furfural' },
  '8029-43-4': { category: caution, name: 'Corn Syrup' },
  '8008-57-9': { category: avoid, name: 'Orange Oil' },
  '68916-89-2': { category: avoid, name: 'Lemon Oil' },
  '8008-26-2': { category: avoid, name: 'Lime Oil' },
  '1406-18-4': { cateogry: avoid, name: 'Vitamin E' },
  '8002-31-1': { category: avoid, name: 'Cocoa Butter' },
  '77-93-0': { category: research, name: 'Triethyl Citrate' },
  '22047-25-2': { category: research, name: 'Acetyl Pyrazine' },
  '513-86-0': { category: research, name: 'Acetoin' },
  '600-14-6': { category: research, name: 'Acetyl Propionyl' },
  '431-03-8': { category: research, name: 'Diacetyl' },
  '58-95-7': { category: avoid, name: 'Vitamin E Acetate' },
  '124-07-2': { category: research, name: 'Caprylic Acid' },
  '98-0-0': { category: avoid, name: 'Furfuryl alcohol' },
  '58-86-6': { category: caution, name: 'Xylose' },
  '8028-89-5': { category: avoid, name: 'Caramel color' },
  '8006-90-4': { category: avoid, name: 'Peppermint oil' },
  '8015-91-6': { category: avoid, name: 'Cinnamon leaf oil' },
  '84082-68-8': { category: avoid, name: 'Nutmeg oil' },
  '8000-34-8': { category: avoid, name: 'Clove leaf oil' },
  '8016-88-4': { category: avoid, name: 'Tarragon oil' },
  '90131-45-6': { category: avoid, name: 'Clove/tarragon oil' },
  '84775-42-8': { category: avoid, name: 'Anise oil' },
  '84650-59-9': { category: avoid, name: 'Anise oil' },
  '8006-84-6': { category: avoid, name: 'Fennel oil' },
  '16409-43-1': { category: avoid, name: 'Rose oxide' },
  '9005-65-6 ': { category: avoid, name: 'Polysorbate 80' }
};
