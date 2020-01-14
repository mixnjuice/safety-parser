import dotenv from 'dotenv';

dotenv.config();

export const database = {
  host: process.env.SDS_DB_HOSTNAME,
  user: process.env.SDS_DB_USERNAME,
  password: process.env.SDS_DB_PASSWORD,
  database: process.env.SDS_DB_DATABASE
};

export const logging = {
  level: process.env.SDS_LOG_LEVEL || 'info',
  timestampFormat: process.env.SDS_LOG_TIME_FMT
};

export default {
  logging
};
