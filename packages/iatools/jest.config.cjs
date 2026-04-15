const rootConfig = require('../../jest.config');
module.exports = {
  ...rootConfig,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
