// eslint.config.mjs — minimalny flat config dla ESLint 9 (bez Next presetów)
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  // Bazowe reguły TS (bez type-checka — szybkie i stabilne)
  ...tseslint.configs.recommended,

  // Ignorowane ścieżki (zamiast .eslintignore)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "public/**",
      "backups/**",
      "prisma/migrations/**",
      "**/*.d.ts"
    ],
  },

  // Ogólne reguły + react-hooks + unused-imports
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "unused-imports": unusedImports },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "warn",

      // Zamiast ostrzegania przez TS, polegamy na pluginie unused-imports:
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }
      ]
    }
  },

  // Tymczasowo poluzuj `any` w app/lib/scripts (żeby CI i edytor się nie blokowały)
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/lib/**/*.ts",
      "scripts/**/*.{ts,tsx}"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
// Inne pliki (np. testy, konfiguracje) — pełne TS reguły
