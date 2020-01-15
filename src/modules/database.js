import knex from 'knex';

import { database as config } from 'modules/config';

const client = knex({
  client: 'pg',
  connection: config
});

export const querySingle = async query => {
  const results = await query;

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return results[0];
};

export const queryMultiple = async query => {
  const results = await query;

  if (!Array.isArray(results)) {
    return [];
  }

  return results;
};

export const findFlavor = (flavorName, vendorCode) =>
  client('flavor as f')
    .innerJoin('vendor as v', 'f.vendor_id', 'v.id')
    .select('id', 'name', 'slug', 'density')
    .select({
      vendorId: 'v.id'
    })
    .where('f.name', 'like', `%${flavorName}%`)
    .where('v.code', vendorCode);

export const getIngredients = () =>
  client('ingredient')
    .select(['id', 'name', 'notes', 'created', 'updated'])
    .select({
      casNumber: 'cas_number',
      ingredientCategoryId: 'ingredient_category_id'
    });

export const getIngredient = id => getIngredients().where('id', id);

export const getCategories = () =>
  client('ingredient_category').select([
    'id',
    'name',
    'ordinal',
    'description'
  ]);

export const getCategory = id => getCategories().where('id', id);

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

export const closeDatabase = client.close;
