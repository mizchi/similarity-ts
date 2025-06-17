import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*_test.ts", "test/**/*_test.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["**/*_test.ts", "test/**", "examples/**", "scripts/**"],
    },
  },
});
