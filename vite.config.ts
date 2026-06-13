import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Ağır vendor kütüphanelerini ayrı chunk'lara böl —
        // 500kB uyarılarını azaltır + tarayıcı cache'i iyileşir
        // (vendor değişmedikçe app bundle değişse de tekrar indirilmez).
        manualChunks: {
          // 3D motor: three + R3F + drei (en ağır grup)
          "3d": ["three", "@react-three/fiber", "@react-three/drei"],
          // Excel dışa aktarım
          excel: ["exceljs"],
          // PDF dışa aktarım
          pdf: ["jspdf", "jspdf-autotable"],
          // React çekirdek + router
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
