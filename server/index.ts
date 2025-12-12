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

// 🟢 CORRECCIÓN CRÍTICA PARA ARCHIVOS ESTÁTICOS
// 1. Obtenemos la ruta absoluta a la carpeta 'uploads' desde la raíz del proyecto.
//    Usamos path.resolve(process.cwd(), 'uploads') para que sea seguro en cualquier entorno.
const uploadsDir = path.resolve(process.cwd(), "uploads");

// 2. Aseguramos que la carpeta exista antes de intentar servirla.
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 [INFO] Carpeta de subidas creada en: ${uploadsDir}`);
  } catch (err) {
    console.error("❌ [ERROR] No se pudo crear la carpeta 'uploads':", err);
    // Si esto falla, las imágenes no funcionarán, pero el server debe seguir.
  }
}

// 3. Servimos la carpeta 'uploads' en la URL '/uploads'.
//    Ejemplo: Un archivo en /app/uploads/foto.jpg será accesible en http://host/uploads/foto.jpg
console.log(`📂 [INFO] Sirviendo archivos estáticos desde: ${uploadsDir}`);
app.use("/uploads", express.static(uploadsDir));


app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      // Simplificamos el log para que sea menos ruidoso
      const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
       // log(logLine); // Descomenta si usas la función log personalizada
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

    // Puerto estándar para Cloud Run
    const port = parseInt(process.env.PORT || '8080', 10);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Servidor LISTO y escuchando en puerto ${port}`);
      console.log(`   - Entorno: ${app.get("env")}`);
      console.log(`   - Directorio base: ${process.cwd()}`);
    });

  } catch (err) {
    console.error("❌ Error FATAL al iniciar el servidor:", err);
    process.exit(1); // Salir si algo crítico falla al inicio
  }
})();