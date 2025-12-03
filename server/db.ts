import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import "dotenv/config";

// Base configuration
const dbConfig: mysql.PoolOptions = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Intelligent Logic:
// If INSTANCE_CONNECTION_NAME exists, we use Google's Unix Socket (Production in Cloud Run)
// If not, we use DB_HOST and DB_PORT (Local Development or External TCP)
if (process.env.INSTANCE_CONNECTION_NAME) {
  console.log(`🔌 Connecting to Cloud SQL via Socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
  // When using socketPath, host/port are ignored.
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  if (!process.env.DB_HOST) {
    throw new Error("❌ Missing credentials: DB_HOST or INSTANCE_CONNECTION_NAME is required.");
  }
  console.log(`🔌 Connecting to Database via TCP: ${process.env.DB_HOST}`);
  dbConfig.host = process.env.DB_HOST;
  dbConfig.port = Number(process.env.DB_PORT) || 3306;
  
  // Only apply SSL for TCP connections if not running on localhost (to avoid self-signed cert errors locally if not configured)
  if (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
      dbConfig.ssl = { rejectUnauthorized: false }; 
  }
}

export const poolConnection = mysql.createPool(dbConfig);

export const db = drizzle(poolConnection, { schema, mode: "default" });