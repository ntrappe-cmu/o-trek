// To treat .js files as ES modules in Jest
module.exports = {
  testMatch: ["**/tests/jest/**/*.js"],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
};