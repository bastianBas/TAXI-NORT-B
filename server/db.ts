import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import "dotenv/config";

const dbConfig: mysql.PoolOptions = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// LÓGICA DE CONEXIÓN HÍBRIDA
if (process.env.INSTANCE_CONNECTION_NAME) {
  // ☁️ MODO NUBE (Cloud Run)
  // Usamos el Socket Unix que Google inyecta automáticamente
  console.log(`🔌 Conectando a Cloud SQL vía Socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  // 🏠 MODO LOCAL (Tu PC)
  // Usamos la IP pública y el puerto estándar
  if (!process.env.DB_HOST) {
    throw new Error("❌ Faltan credenciales: DB_HOST o INSTANCE_CONNECTION_NAME");
  }
  console.log(`🔌 Conectando vía TCP: ${process.env.DB_HOST}`);
  dbConfig.host = process.env.DB_HOST;
  dbConfig.port = Number(process.env.DB_PORT) || 3306;
  
  // SSL opcional para local
  if (process.env.DB_HOST !== 'localhost') {
      dbConfig.ssl = { rejectUnauthorized: false };
  }
}

export const poolConnection = mysql.createPool(dbConfig);
export const db = drizzle(poolConnection, { schema, mode: "default" });