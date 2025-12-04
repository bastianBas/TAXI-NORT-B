import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session"; // Usamos cookie-session
import passport from "passport";
import cors from "cors";

const app = express();

// Confianza en proxy (Vital para Render y Cloud Run)
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- NUEVA CONFIGURACIÓN DE SESIÓN (COOKIE-SESSION) ---
// Esto guarda los datos de sesión en la cookie misma, en lugar de en la memoria del servidor.
// Es mucho más estable para reinicios y proxies.
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: process.env.NODE_ENV === "production", // True en Producción (Render/Cloud Run)
    sameSite: "lax",
    httpOnly: true,
  })
);

// Inicializar Passport
// Mantenemos passport igual, pero ahora se engancha a la nueva cookie
app.use(passport.initialize());
app.use(passport.session());

// Middleware de Logging
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
      log(logLine);
    }
  });
  next();
});

(async () => {
  try {
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

    // Escuchamos en el puerto definido por el entorno o 5000 por defecto
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, '0.0.0.0', () => {
      log(`🚀 Servidor escuchando en http://0.0.0.0:${port}`);
    });
  } catch (err) {
    console.error("❌ Error fatal al iniciar:", err);
  }
})();