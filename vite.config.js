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
        // Chunk size warning eşiği — büyük 3D/PDF/Excel asset'leri
        // ayrı chunk'lara böldükten sonra 800kB makul üst sınır.
        chunkSizeWarningLimit: 800,
        rollupOptions: {
            output: {
                // Manuel chunk split — ağır vendor'ları ayrı bundle:
                //   three   → R3F + drei + Three.js (3D motor, ~700kB)
                //   pdf     → jsPDF + html2canvas (export-pdf, ~440kB)
                //   excel   → exceljs (export-excel, ~940kB)
                //   react   → react + react-dom + react-router (~140kB)
                //   vendor  → diğer node_modules
                manualChunks(id) {
                    if (!id.includes("node_modules")) return undefined;
                    if (id.includes("@react-three") || id.includes("/three/")) {
                        return "three";
                    }
                    if (id.includes("jspdf") || id.includes("html2canvas")) {
                        return "export-pdf";
                    }
                    if (id.includes("exceljs")) {
                        return "export-excel";
                    }
                    if (
                        id.includes("react-router") ||
                        id.includes("/react-dom/") ||
                        id.includes("/react/") ||
                        id.includes("scheduler")
                    ) {
                        return "react";
                    }
                    return "vendor";
                },
            },
        },
    },
});
