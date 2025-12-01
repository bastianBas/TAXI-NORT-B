import { defineConfig } from "drizzle-kit";
import 'dotenv/config'; // Aseguramos que cargue las variables de entorno

// Verificamos que las variables críticas existan (igual que en tu script de prueba)
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error("Faltan variables de entorno. Asegúrate de tener DB_HOST, DB_USER, DB_PASSWORD y DB_NAME configurados.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql", // Cambio crucial para Aiven (MySQL)
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    // Aiven requiere SSL. drizzle-kit pasará estas opciones al driver mysql2
    ssl: { 
      rejectUnauthorized: false 
    },
  },
});