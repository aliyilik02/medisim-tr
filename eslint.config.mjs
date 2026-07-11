// ============================================================
// ESLint flat config (R5, 11 Tem 2026) — CI lint zinciri onarımı
// ============================================================
// Bilinen borç: package.json'da "lint" script'i vardı ama eslint
// paketi + config YOKTU → CI `npm run lint --if-present` patlıyordu.
// Hedef: DÜŞÜK gürültü, YÜKSEK sinyal — tip disiplini zaten tsc'de
// (52k satırda 11 any); burada gerçek hata yakalayan kurallar +
// react-hooks kuralları. Stil kuralı yok (Prettier/format işi değil).
// ============================================================

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "backend/node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "backend/src/generated/**", // üretilmiş katalog (gen:personas)
      ".claude/**",
      "backend/.wrangler/**", // wrangler dev geçici bundle'ları
      "docs/**", // Obsidian vault eklentileri dahil — kod tabanı değil
      "scratch/**", // tek-seferlik inceleme scriptleri
      "assets/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks v7 "React Compiler" dönemi katı kuralları: kod tabanındaki
      // BİLİNÇLİ mirror-ref desenlerini (phaseSignalRef/sessionRef/useStableValue
      // — render sırasında ref yazımı, React docs'un kabul ettiği desen) hata
      // sayıyor. Compiler'a geçene kadar uyarı: yeni kod sinyali alsın,
      // CI kırılmasın.
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      // tsc noUnusedLocals/Parameters zaten kapıda — çift raporlama olmasın,
      // ama alışkanlık deseni olan `_` öneki her yerde muaf kalsın.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Mevcut kod tabanı gerçekleri (bilinçli desenler) — hataya çevirme:
      "@typescript-eslint/no-explicit-any": "warn", // 11 adet, 7'si Three.js zorunluluğu
      "no-empty": ["error", { allowEmptyCatch: true }], // sessiz fallback deseni yaygın
    },
  },
  {
    // Node ortamı: script'ler, config'ler, worker backend
    files: ["scripts/**", "*.config.{js,mjs,ts}", "backend/**"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tek-seferlik üretim scriptleri: kullanılmayan yardımcı fonksiyon
    // gelecekteki enjeksiyon turları için bilinçli tutuluyor — uyarı yeter.
    files: ["scripts/**"],
    rules: { "@typescript-eslint/no-unused-vars": "warn" },
  },
);
