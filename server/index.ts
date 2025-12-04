import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA EN PROXY (CRÍTICO PARA CLOUD RUN)
// 'true' le dice a Express que confíe en los encabezados del balanceador de carga de Google
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN PARA LA NUBE
// Esta configuración es la más compatible para evitar bloqueos de cookies en dominios .run.app
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    
    // CONFIGURACIÓN CLAVE PARA CLOUD RUN:
    // secure: true -> Requerido porque Cloud Run siempre es HTTPS.
    // sameSite: 'none' -> Permite que la cookie funcione mejor en ciertos contextos de red/proxies.
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
      // Logueamos si hay usuario para saber si la cookie funcionó
      const userLog = req.user ? `[User: ${(req.user as any).email}]` : "[No User]";
      console.log(`${req.method} ${req.path} ${res.statusCode} ${userLog} in ${duration}ms`);
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
      console.log(`🚀 [Startup] Servidor listo en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ [Startup] Error fatal:", err);
    process.exit(1);
  }
})();