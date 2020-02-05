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
  INW: /([\w\d\s]+)(\([0-9]\))?\.pdf/,
  VTA: /SDS-VTA-(.*)\.pdf/,
  FA: /FA[0-9]+_(.*)_.*\.pdf/,
  FM: /[0-9]+\s(.*)\sflavour.*/i,
  HS: /[0-9]+\s(.*)\.pdf/,
  NR: /([\w\d\s]+)\s—\sNicRiv SDS\.pdf/
};
