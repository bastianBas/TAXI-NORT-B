import { defineConfig } from "drizzle-kit";
import "dotenv/config";

if (!process.env.DB_HOST) {
  throw new Error("Faltan variables de entorno de la base de datos (DB_HOST).");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    // La configuración SSL es crucial para conectarse a Cloud SQL desde fuera de Google Cloud
    // 'rejectUnauthorized: false' permite certificados autofirmados que Cloud SQL a veces usa por defecto en conexiones públicas
    ssl: { rejectUnauthorized: false }, 
  },
});