import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA EN PROXY (CRÍTICO PARA CLOUD RUN)
// Cloud Run termina el SSL antes de llegar al contenedor.
// 'true' o '1' le dice a Express que confíe en las cabeceras X-Forwarded-Proto
app.set("trust proxy", 1); 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN (COOKIE-SESSION)
// Esta configuración está optimizada para Cloud Run
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    
    // IMPORTANTE: secure: true es necesario porque Cloud Run siempre es HTTPS.
    // sameSite: 'none' permite que la cookie funcione mejor con proxies.
    secure: true, 
    sameSite: "none",
    httpOnly: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware de Logging
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

    const port = parseInt(process.env.PORT || '8080', 10);
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 [Startup] Servidor web LISTO y escuchando en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ [Startup] Error fatal al iniciar:", err);
    process.exit(1);
  }
})();