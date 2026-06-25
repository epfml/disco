// @ts-check

import pluginVitest from "@vitest/eslint-plugin";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import pluginCypress from "eslint-plugin-cypress";
import pluginVue from "eslint-plugin-vue";

export default defineConfigWithVueTs(
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.js",
            "isomorphic-wrtc/{{browser,node}.js,types.d.ts}",
            "testSetupImportTFJSNode.ts",
            "vitest.config.ts",
          ],
        },
      },
    },
  },
  {
    rules: {
      // taken from https://typescript-eslint.io/rules/no-unused-vars/
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // allow for nicer names
      "@typescript-eslint/no-namespace": "off",
      // rule is buggy, might be necessary to disable it entirely
      "@typescript-eslint/no-unnecessary-type-assertion": [
        "error",
        {
          typesToIgnore: ["Model", "DataType"],
        },
      ],
    },
  },
  {
    files: ["webapp/**"],
    rules: {
      // Buggy rule in typescript-eslint 8.59 and at least until 8.62. Check if future versions fix it
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
  {
    ...pluginVitest.configs.recommended,
    files: ["**/*.spec.ts"],
    rules: {
      // broken w/ BDD https://github.com/vitest-dev/eslint-plugin-vitest/issues/675
      "vitest/valid-expect": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    ...pluginCypress.configs.recommended,
    files: ["webapp/cypress/**/*.ts"],
  },
  { ignores: ["**/dist/*"] },
  { ignores: ["**/src/protobuf/"] },

  // don't use linter for formatting
  skipFormatting,
);
