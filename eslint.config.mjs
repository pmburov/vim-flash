import { defineConfig, globalIgnores } from "eslint/config"
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["**/out", "**/dist", "**/*.d.ts", "**/backup"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
])
