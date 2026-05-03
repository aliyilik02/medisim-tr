import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    setupFiles: ["tests/setup/clinical-protection.ts"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/data/**",
        "src/main.tsx",
        "src/App.tsx",
        "src/components/**",
        "src/pages/**",
        "src/hooks/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      thresholds: {
        "src/lib/**": { lines: 85, branches: 85, functions: 85 },
        "src/engine/**": { lines: 80, branches: 80, functions: 80 },
      },
    },
  },
});
