import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";

const app = express();

app.set("trust proxy", true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 🟢 MEJORA: Crear carpeta uploads si no existe para evitar crash
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Carpeta creada: ${uploadsDir}`);
  } catch (err) {
    console.error("❌ Error creando carpeta uploads:", err);
  }
}
app.use("/uploads", express.static(uploadsDir));

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
    console.log("🚀 [Inicio] Configurando servidor...");
    
    // Aquí se registran las rutas y se conecta a la DB
    const server = await registerRoutes(app);
    console.log("✅ [Inicio] Rutas registradas correctamente.");

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
      console.log(`🚀 Servidor LISTO y escuchando en puerto ${port}`);
    });
  } catch (err) {
    console.error("❌ Error FATAL al iniciar:", err);
    process.exit(1);
  }
})();