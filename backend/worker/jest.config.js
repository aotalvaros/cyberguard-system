/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json'
    }]
  },
  
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: process.env.CI ? 2 : '50%'
};