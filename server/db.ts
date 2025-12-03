import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import "dotenv/config";

// Configuración dinámica
const dbConfig: mysql.PoolOptions = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Lógica inteligente:
// Si existe INSTANCE_CONNECTION_NAME, usamos el Socket de Google (Producción)
// Si no, usamos DB_HOST y DB_PORT (Desarrollo Local o Aiven antiguo)
if (process.env.INSTANCE_CONNECTION_NAME) {
  console.log(`🔌 Conectando a Cloud SQL vía Socket: ${process.env.INSTANCE_CONNECTION_NAME}`);
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  if (!process.env.DB_HOST) {
    throw new Error("❌ Faltan credenciales: DB_HOST o INSTANCE_CONNECTION_NAME");
  }
  console.log(`🔌 Conectando a Base de Datos vía TCP: ${process.env.DB_HOST}`);
  dbConfig.host = process.env.DB_HOST;
  dbConfig.port = Number(process.env.DB_PORT) || 3306;
  dbConfig.ssl = { rejectUnauthorized: false }; // Solo para conexiones TCP externas
}

export const poolConnection = mysql.createPool(dbConfig);

export const db = drizzle(poolConnection, { schema, mode: "default" });