// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import next from "eslint-config-next";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

// Bazowa konfiguracja Next (flat) + TS
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Ignorowane ścieżki (zamiast .eslintignore w ESLint 9)
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

  // Zmiękczenia globalne: niech prefer-const i unused-vars będą ostrzeżeniami
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // API + skrypty: wyłączamy no-explicit-any (żeby nie blokowało CI)
  {
    files: [
      "scripts/**/*.{ts,tsx}",
      "src/app/api/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
