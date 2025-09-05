module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020, // Updated to support optional chaining
  },
  extends: [
    "eslint:recommended",
    "google",
    "plugin:promise/recommended",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "warn",
    "quotes": ["error", "double", { allowTemplateLiterals: true }],
    "semi": ["error", "always"],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "comma-dangle": ["error", "always-multiline"], // Enforce trailing commas
    "object-curly-spacing": ["error", "never"], // No spaces inside curly braces
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
