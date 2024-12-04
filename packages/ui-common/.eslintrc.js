module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    // Must come last
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    // This rule obfuscates TypeScript errors.
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    // Disable the React import requirement since we're using the new JSX transform
    "react/react-in-jsx-scope": "off",
  },
};
