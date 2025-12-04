import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// Confianza en proxy (Vital para Cloud Run)
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuración de Sesión
// Vamos a usar 'lax' que es más tolerante para navegación directa
const isProduction = process.env.NODE_ENV === "production";

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    // IMPORTANTE: secure: true en producción es necesario.
    // Pero asegurémonos de que 'trust proxy' esté funcionando.
    secure: isProduction, 
    sameSite: "lax", // Cambiamos 'none' a 'lax' para probar compatibilidad estándar
    httpOnly: true,
    path: "/",
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware de Logging detallado para depurar cookies
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log de entrada para ver si llegan cookies
  if (req.path.startsWith("/api")) {
    const hasSession = req.session && req.session.passport && req.session.passport.user;
    console.log(`📥 [Request] ${req.method} ${req.path} - Cookie Session: ${hasSession ? 'SÍ (ID: ' + req.session.passport.user + ')' : 'NO'}`);
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