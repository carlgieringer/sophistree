export default {
  testRegex: "\\.test\\.tsx?$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.js"],
};
