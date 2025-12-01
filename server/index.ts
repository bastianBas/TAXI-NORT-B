import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import cors from "cors";

const app = express();

// 1. CONFIANZA EN PROXY (CRÍTICO PARA RENDER)
// Confiamos en el proxy de Render para manejar HTTPS
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. CONFIGURACIÓN DE SESIÓN AJUSTADA
const MemoryStore = createMemoryStore(session);
const isProduction = process.env.NODE_ENV === "production";

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || "taxinort_secret_key",
  resave: false,
  saveUninitialized: false, // Importante: false para no crear sesiones vacías
  cookie: {
    // ESTRATEGIA HÍBRIDA:
    // En Render, el tráfico interno a veces se ve como HTTP aunque fuera sea HTTPS.
    // Usar secure: false con sameSite: 'lax' suele ser lo más compatible para evitar problemas de login.
    // Si esto falla, la única opción segura es secure: true + dominio personalizado.
    secure: isProduction, // Intentemos de nuevo con true, ya que 'trust proxy' está activo
    httpOnly: true, // Protege contra XSS
    sameSite: "lax", // Permite navegación normal
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
```

### Paso 2: Asegurar la Respuesta de Login (`server/auth.ts`)

Asegúrate de que `server/auth.ts` esté **exactamente** como te lo di en la última respuesta (con los logs de depuración y el `req.session.save`).

Si tienes dudas, aquí te dejo el bloque clave que **debe** estar en `server/auth.ts`:

```typescript
  // En server/auth.ts
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Error de autenticación" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // ESTO ES LO QUE HACE QUE LA SESIÓN SE GUARDE SÍ O SÍ
        req.session.save((err) => {
          if (err) {
            console.error("❌ Error guardando sesión:", err);
            return next(err);
          }
          console.log(`✅ Sesión guardada para ${user.email}`);
          const { password, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        });
      });
    })(req, res, next);
  });