export default {
  testRegex: "\\.test\\.tsx?$",
  moduleNameMapper: {
    "^((\\./|(\\.\\./)+).*)\\.js$": "$1",
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.js"],
};
