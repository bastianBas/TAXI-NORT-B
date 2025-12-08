import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA TOTAL EN EL PROXY (CRÍTICO)
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN AJUSTADA
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    
    // CAMBIO IMPORTANTE: Usamos 'lax' que es más robusto para navegación directa
    // secure: true solo en producción.
    secure: process.env.NODE_ENV === "production", 
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware de Logging y Diagnóstico de Sesión
app.use((req, res, next) => {
  const start = Date.now();
  
  if (req.path.startsWith("/api")) {
    // Diagnóstico: ¿Llega la sesión?
    const hasSession = req.session && req.session.passport && req.session.passport.user;
    console.log(`📥 [Request] ${req.method} ${req.path} - Session UserID: ${hasSession ? req.session.passport.user : 'NINGUNO'}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`📤 [Response] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  try {
    console.log("🚀 [Startup] Iniciando servidor TaxiNort...");
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
      console.log(`🚀 Servidor escuchando en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ Error fatal al iniciar:", err);
    process.exit(1);
  }
})();