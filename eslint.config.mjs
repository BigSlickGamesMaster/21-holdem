import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";


export default [
  {
    ignores: [
      "build/**",
      "node_modules/**",
      "src/_backup_25apr_profilefix/**",
    ],
  },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        Intl: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/*.test.js"],
    rules: {
      "no-redeclare": "off",
    },
  },
];
