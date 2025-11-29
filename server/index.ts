import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import cors from "cors";

const app = express();

// --- CONFIGURACIÓN CRÍTICA PARA RENDER ---
// Esto es vital: le dice a Express que confíe en el proxy de Render (que maneja HTTPS).
// Sin esto, las cookies seguras no funcionan y la sesión se pierde.
app.set("trust proxy", 1); 

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- CONFIGURACIÓN DE SESIÓN ---
const MemoryStore = createMemoryStore(session);
// Detectamos si estamos en producción (Render)
const isProduction = process.env.NODE_ENV === "production";

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || "taxinort_secure",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // En producción (Render/HTTPS) debe ser true. En local (HTTP) debe ser false.
    secure: isProduction, 
    httpOnly: true,
    // 'lax' es importante para que la cookie sobreviva redirecciones
    sameSite: "lax", 
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Logging Middleware (Para ver errores en consola)
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

    // Manejador de errores global
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

    // Escuchar en 0.0.0.0 es necesario para Render
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, '0.0.0.0', () => {
      log(`🚀 Servidor escuchando en http://0.0.0.0:${port}`);
    });
  } catch (err) {
    console.error("❌ Error fatal al iniciar:", err);
  }
})();