import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// 1. Confianza en el Proxy de Google Cloud Run
app.set("trust proxy", true);

// 2. Configuración Básica
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Necesario para leer cookies si enviamos el token ahí también

// 3. Logging de Tráfico
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  try {
    console.log("🚀 [Startup] Iniciando servidor TaxiNort (Modo JWT)...");
    const server = await registerRoutes(app);

    // Manejo de errores global
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("❌ Error del Servidor:", err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // IMPORTANTE: Usar el puerto que Cloud Run inyecta (PORT)
    const port = parseInt(process.env.PORT || '8080', 10);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 [Startup] Servidor web LISTO y escuchando en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ [Startup] Error fatal al iniciar:", err);
    process.exit(1);
  }
})();