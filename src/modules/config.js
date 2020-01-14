import dotenv from 'dotenv';

dotenv.config();

export const logging = {
  level: process.env.SDS_LOG_LEVEL || 'info',
  timestampFormat: process.env.SDS_LOG_TIME_FMT
};

export default {
  logging
};
