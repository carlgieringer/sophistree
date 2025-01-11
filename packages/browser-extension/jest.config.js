/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  // Just transform all node_modules for convenience
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ["../../jest/jsDomWhatWgTextEncoder.js"],
};

module.exports = config;
