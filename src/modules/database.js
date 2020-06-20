import knex from 'knex';

import { database as config } from 'modules/config';

const client = knex({
  client: 'pg',
  connection: config
});

export const querySingle = async (query) => {
  const results = await query;

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return results[0];
};

export const queryMultiple = async (query) => {
  const results = await query;

  if (!Array.isArray(results)) {
    return [];
  }

  return results;
};

export const findFlavor = (flavorName, vendorCode) => {
  const flavorTokens = flavorName
    .toLowerCase()
    .replace(/[\\(\\)]/g, '')
    .replace(' & ', '')
    .replace(/\s+/g, ' & ')
    .replace(/'/g, "''");

  return client('flavor as f')
    .innerJoin('vendor as v', 'f.vendor_id', 'v.id')
    .select({
      id: 'f.id',
      name: 'f.name',
      slug: 'f.slug',
      vendorId: 'v.id',
      vendorCode: 'v.code'
    })
    .where(client.raw(`to_tsvector(f.name) @@ to_tsquery('${flavorTokens}')`))
    .where('v.code', vendorCode);
};

export const getIngredients = () =>
  client('ingredient as i')
    .innerJoin('ingredient_category as ic', 'i.ingredient_category_id', 'ic.id')
    .select({
      id: 'i.id',
      name: 'i.name',
      notes: 'i.notes',
      created: 'i.created',
      updated: 'i.updated',
      casNumber: 'i.cas_number',
      category: 'ic.name'
    });

export const getIngredientByCasNumber = (casNumber) =>
  getIngredients().where('cas_number', casNumber);

export const getCategories = () =>
  client('ingredient_category').select([
    'id',
    'name',
    'ordinal',
    'description'
  ]);

export const getCategoryByName = (name) => getCategories().where('name', name);

export const getVendors = () =>
  client('vendor').select(['id', 'name', 'slug', 'code']);

export const getVendorByCode = (code) => getVendors().where('code', code);

export const getFlavorIngredients = () =>
  client('flavors_ingredients').select({
    flavorId: 'flavor_id',
    ingredientId: 'ingredient_id'
  });

export const getFlavorIngredient = (flavorId, ingredientId) =>
  getFlavorIngredients().where({
    /* eslint-disable camelcase */
    flavor_id: flavorId,
    ingredient_id: ingredientId
    /* eslint-enable camelcase */
  });

export const insertFlavorIngredient = (flavorId, ingredientId) =>
  client('flavors_ingredients').insert({
    /* eslint-disable camelcase */
    flavor_id: flavorId,
    ingredient_id: ingredientId,
    /* eslint-enable camelcase */
    created: client.fn.now(),
    updated: client.fn.now()
  });

export const getIdentifiers = (vendorCode, flavorName, ingredientName) =>
  client('flavor as f')
    .select({
      flavorId: 'f.id',
      ingredientId: 'i.id'
    })
    .innerJoin('vendor as v', 'f.vendor_id', 'v.id')
    .join('ingredient as i', 'i.name', client.raw(`'${ingredientName}'`))
    .where({
      'v.code': vendorCode,
      'f.name': flavorName
    });

export const closeDatabase = () => client.destroy();
