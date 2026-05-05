module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/out-tsc/', 'src/test\\.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^ionicons/components/(.*)$': '<rootDir>/__mocks__/empty.js',
    '^@ionic/core/components/(.*)$': '<rootDir>/__mocks__/empty.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@ionic|@stencil|ionicons|@capacitor|rxjs|lodash-es|ng2-charts|date-fns)/|.*\\.mjs$)',
  ],
};
