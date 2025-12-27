module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    // Prevent apps from importing from other apps
    // Note: This ESLint rule provides basic protection, but the script-based check
    // (pnpm check-boundaries) provides more comprehensive enforcement and is run in CI
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          // Apps can only import from packages or relative files within the same app
          {
            target: "./apps/*/",
            from: "./apps/*/",
            except: ["./"],
            message: "Apps cannot import from other apps. Use packages (@sb/*) for shared code or communicate via events.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: [
        "plugin:@typescript-eslint/recommended",
      ],
      rules: {},
    },
  ],
  ignorePatterns: ["node_modules", "dist", "build", ".next", "*.config.js", "*.config.ts"],
};

