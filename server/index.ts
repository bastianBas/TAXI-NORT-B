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

// Mantenemos el límite de 50mb que configuramos antes
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use(cookieParser());

// Configuración de carpeta uploads
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 [INFO] Carpeta de subidas creada en: ${uploadsDir}`);
  } catch (err) {
    console.error("❌ [ERROR] No se pudo crear la carpeta 'uploads':", err);
  }
}

console.log(`📂 [INFO] Sirviendo archivos estáticos desde: ${uploadsDir}`);
app.use("/uploads", express.static(uploadsDir));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
       console.log(logLine);
    }
  });
  next();
});

(async () => {
  try {
    console.log("🚀 [Inicio] Configurando servidor...");
    
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
    
    // 🟢 AQUÍ ESTÁ EL CAMBIO IMPORTANTE:
    // Guardamos la instancia del servidor en una variable 'runningServer'
    const runningServer = server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Servidor LISTO y escuchando en puerto ${port}`);
      console.log(`   - Entorno: ${app.get("env")}`);
      console.log(`   - Directorio base: ${process.cwd()}`);
    });

    // 🟢 AUMENTAMOS EL TIMEOUT A 10 MINUTOS
    // Esto evita que el servidor cierre la conexión si el celular es lento subiendo la foto
    runningServer.setTimeout(10 * 60 * 1000); 

  } catch (err) {
    console.error("❌ Error FATAL al iniciar el servidor:", err);
    process.exit(1);
  }
})();