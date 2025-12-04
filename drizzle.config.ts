import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Verificamos que la variable de entorno exista antes de empezar
if (!process.env.DB_HOST) {
  throw new Error("❌ Faltan variables de entorno (DB_HOST). Asegúrate de tener el archivo .env configurado.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql", // Nos aseguramos de que diga 'mysql'
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    // ESTO ES CLAVE: SSL es obligatorio para conectarse a Cloud SQL desde tu PC
    ssl: { rejectUnauthorized: false }, 
  },
});