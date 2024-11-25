module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    // Must come last
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/switch-exhaustiveness-check": "error",
  },
};
