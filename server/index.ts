import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser"; 
import cors from "cors";

const app = express();

// 1. CONFIANZA EN PROXY (Vital para Cloud Run)
app.set("trust proxy", true);

// 2. MIDDLEWARES BÁSICOS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. PARSEADOR DE COOKIES (Vital para leer el Token JWT)
app.use(cookieParser());

// 4. LOGGING
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      console.log(logLine); 
    }
  });
  next();
});

(async () => {
  try {
    console.log("🚀 [Startup] Iniciando servidor TaxiNort...");
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