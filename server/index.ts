import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA EN PROXY (Vital para Cloud Run)
app.set("trust proxy", true);

// 2. MIDDLEWARES BÁSICOS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. CONFIGURACIÓN DE SESIÓN (COOKIE-SESSION)
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
  })
);

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// 4. LOGGING DE ARRANQUE Y TRÁFICO
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
    console.log("🚀 [Startup] Iniciando configuración del servidor...");
    
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

    // 5. PUERTO CLOUD RUN (CRÍTICO)
    // Cloud Run inyecta la variable PORT. Si no existe, usamos 8080 (estándar de Google).
    // NO usamos 5000 en producción.
    const PORT = parseInt(process.env.PORT || '8080', 10);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [Startup] Servidor web LISTO y escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ [Startup] Error fatal al iniciar:", err);
    process.exit(1);
  }
})();