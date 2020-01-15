import { closeDatabase } from 'modules/database';
import { getLogger } from 'modules/logging';
import { parseAllDirectories } from 'modules/parser';

const log = getLogger('app');

const execute = async () => {
  try {
    await parseAllDirectories();
  } catch (error) {
    log.error(error.message);
  } finally {
    closeDatabase();
  }
};

execute();
