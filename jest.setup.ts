import { config } from 'dotenv';

config({ path: ['.env.local'] });
config({ path: ['.env.test'] });

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});

  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
