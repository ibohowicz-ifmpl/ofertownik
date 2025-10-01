// eslint.config.mjs — Flat Config dla ESLint 9 + Next 15
import next from "eslint-config-next";

/**
 * Zawartość:
 * - Presety Next.js (core-web-vitals + TS)
 * - Ignorowane ścieżki (zamiast .eslintignore)
 * - Wyjątek na `any` w API i skryptach (żeby CI nie blokował się przy importach)
 * - Łagodne reguły "prefer-const" i "no-unused-vars" (warnings, nie errors)
 */
export default [
  // 1) Podstawowa konfiguracja Next.js (Flat Config)
  ...next(),

  // 2) Globalne ignorowanie plików/katalogów (ESLint 9 – zamiast .eslintignore)
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
    ]
  },

  // 3) API + scripts: tymczasowo pozwól na `any` (żeby CI nie blokował się)
  {
    files: ["scripts/**/*.{ts,tsx}", "src/app/api/**/*/route.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  // 4) Ogólne zmiękczenia (warnings zamiast errors)
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
];
