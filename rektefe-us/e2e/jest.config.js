module.exports = {
  preset: 'ts-jest',
  testEnvironment: './environment',
  testRunner: 'jest-circus/runner',
  testTimeout: 120000,
  testRegex: '\\.e2e\\.(js|ts)$',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './e2e/reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Rektefe Mechanic App E2E Test Report'
      }
    ]
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/init.ts'],
  collectCoverage: false,
  maxWorkers: 1
};
