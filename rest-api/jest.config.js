module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: './',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/config/*.ts',
    '!src/utils/response.ts',
    '!src/utils/errorHandler.ts',
    '!src/utils/socketNotifications.ts',
    '!src/middleware/errorHandler.ts',
    '!src/middleware/security.ts',
    '!src/middleware/auth.ts',
    '!src/models/*.ts',
    '!src/routes/*.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        isolatedModules: true
      }
    }]
  },
  testTimeout: 30000,
};