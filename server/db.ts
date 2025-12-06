import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import "dotenv/config";

// Configuración base
const dbConfig: mysql.PoolOptions = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Lógica de Conexión Inteligente
// Google Cloud Run inyecta automáticamente INSTANCE_CONNECTION_NAME si se configura la conexión SQL.
if (process.env.INSTANCE_CONNECTION_NAME) {
  // ☁️ MODO NUBE (Cloud Run)
  // Usamos el Socket Unix para una conexión interna, segura y rápida sin salir a internet.
  console.log(`🔌 [DB] Conectando a Cloud SQL vía Socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  // 🏠 MODO LOCAL (Tu PC)
  // Usamos la conexión TCP estándar con la IP pública.
  if (!process.env.DB_HOST) {
    console.warn("⚠️ Advertencia: DB_HOST no definido. La conexión local fallará.");
  } else {
    console.log(`🔌 [DB] Conectando vía TCP: ${process.env.DB_HOST}`);
    dbConfig.host = process.env.DB_HOST;
    dbConfig.port = Number(process.env.DB_PORT) || 3306;
    
    // SSL es necesario para conectarse desde fuera de Google Cloud
    // (a menos que estés usando el Cloud SQL Auth Proxy localmente)
    if (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
        dbConfig.ssl = { rejectUnauthorized: false };
    }
  }
}

export const poolConnection = mysql.createPool(dbConfig);

export const db = drizzle(poolConnection, { schema, mode: "default" });