/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$|.*\\.test\\.ts$',
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  globals: {
    '@swc/jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  projects: [
    '<rootDir>/test/jest.unit.config.json',
    '<rootDir>/test/jest.int.config.json',
    '<rootDir>/test/jest.api.config.json',
  ],
};
