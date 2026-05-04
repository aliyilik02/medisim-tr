import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: [
      "tests/setup/clinical-protection.ts",
      "tests/setup/dom-setup.ts",
    ],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/**/*.{ts,tsx}"],
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
