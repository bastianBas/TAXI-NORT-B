import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true, // Crucial para librerías antiguas
    },
    rollupOptions: {
      output: {
        // Esto ayuda a que el navegador cargue la app más rápido y evita errores de memoria
        manualChunks: {
          vendor: ['react', 'react-dom', 'wouter'],
          pdf: ['@react-pdf/renderer'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'lucide-react']
        }
      }
    }
  },
  // 🟢 ESTO ES LO QUE ARREGLA LA PANTALLA BLANCA CON PDF
  define: {
    global: 'window', 
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer']
  }
});