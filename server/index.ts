import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA TOTAL EN PROXY (CRÍTICO PARA RENDER)
// Usamos 'true' en lugar de '1' para confiar en todos los saltos que hace Render.
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN PERMISIVA
const MemoryStore = createMemoryStore(session);
const isProduction = process.env.NODE_ENV === "production";

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || "taxinort_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // CAMBIO IMPORTANTE: Ponemos 'false' explícitamente para evitar problemas con SSL en Render.
    // Al estar detrás de un proxy HTTPS, esto asegura que la cookie no se bloquee.
    secure: false, 
    httpOnly: true,
    sameSite: "lax", 
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    path: "/"
  }
}));

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

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, '0.0.0.0', () => {
      log(`🚀 Servidor escuchando en http://0.0.0.0:${port}`);
    });
  } catch (err) {
    console.error("❌ Error fatal al iniciar:", err);
  }
})();
