import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod']).default('dev'),
  PORT: z.coerce.number().default(3050),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  NODE_ID: z.string().optional(),
  DATA_PATH: z.string().default('./data'),
  LOG_PATH: z.string().default('./logs'),
});

export type Config = z.infer<typeof ConfigSchema>;

export default (envs: unknown): Config => {
  const config = ConfigSchema.parse(envs);

  if (config.NODE_ENV === 'dev') {
    config.PORT = config.PORT || 3050;
    config.DATA_PATH = './data/dev';
  } else {
    config.PORT = config.PORT || 3051;
    config.DATA_PATH = './data/prod';
  }

  if (!config.NODE_ID) {
    config.NODE_ID = `node-${config.NODE_ENV}-${Date.now()}`;
  }

  return config;
};

export const getConfig = (): Config => {
  return ConfigSchema.parse(process.env);
};
