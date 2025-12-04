import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA TOTAL EN EL PROXY DE GOOGLE
// Esto es vital. Google Cloud Run pone varios proxies delante.
// 'true' hace que Express confíe en las cabeceras X-Forwarded-Proto.
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN AJUSTADA PARA CLOUD RUN
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    
    // ESTRATEGIA HÍBRIDA DE SEGURIDAD:
    // En producción (Cloud Run), secure: true es lo ideal, PERO
    // a veces falla si la cabecera del proxy no llega bien.
    // sameSite: 'none' ayuda con cookies en contextos cruzados,
    // pero requiere secure: true obligatoriamente.
    // 
    // Si esto falla, probaremos secure: false con sameSite: 'lax'.
    // Por ahora, vamos con la configuración estándar segura para HTTPS.
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
  })
);

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging detallado de peticiones para depuración
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Solo logueamos rutas de API para no saturar
    if (req.path.startsWith("/api")) {
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
      console.log(`✅ [Startup] Servidor listo en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ [Startup] Error fatal:", err);
    process.exit(1);
  }
})();