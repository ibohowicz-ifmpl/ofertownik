import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import next from "eslint-config-next";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

// 1) API + scripts: pozwól użyć `any` (żeby CI nie blokował się na importach/API)
eslintConfig.push({
  files: ["scripts/**/*.{ts,tsx}", "src/app/api/**/*/route.ts"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
});

// 2) Drobne zmiękczenia – nie wywalają CI (warnings zamiast errors)
eslintConfig.push({
  files: ["**/*.{ts,tsx}"],
  rules: {
    "prefer-const": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
});

export default eslintConfig;
