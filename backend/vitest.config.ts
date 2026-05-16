import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Root vitest.config.ts'in setupFiles'ı root tests/setup/* yolunu
    // referans veriyor; backend bağımsız paket, oraya bakmamalı.
    setupFiles: [],
  },
});
