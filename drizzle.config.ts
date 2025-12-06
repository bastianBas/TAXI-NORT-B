import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Verificación de seguridad previa
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("❌ Faltan variables de entorno en .env. Revisa DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    // El signo '!' al final le asegura a TypeScript que la variable existe (gracias al if de arriba)
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    port: Number(process.env.DB_PORT) || 3306,
    
    // 'as any' silencia el error de tipo en SSL, pero mantiene la funcionalidad
    // necesaria para conectar a Google Cloud SQL desde fuera.
    ssl: { rejectUnauthorized: false } as any, 
  },
});