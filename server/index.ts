import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieSession from "cookie-session";
import passport from "passport";
import cors from "cors";

const app = express();

// Confianza en proxy
app.set("trust proxy", true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuración de Sesión
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "taxinort_secret_key"],
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Logging
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

    // PUERTO CLOUD RUN: Usar PORT o 8080 por defecto
    const port = parseInt(process.env.PORT || '8080', 10);
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Servidor escuchando en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ Error fatal al iniciar:", err);
    process.exit(1); // Salir con error para que Cloud Run reinicie
  }
})();