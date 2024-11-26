module.exports = {
  extends: ["next/core-web-vitals", "prettier"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ["next/babel"],
    },
  },
};
