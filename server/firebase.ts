import admin from "firebase-admin";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  try {
    // 1. INTENTO: Variables de Entorno (Producción / Render)
    // Esto es lo que usará Render cuando despliegues la web.
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log("🔥 [Firebase] Inicializando con VARIABLES DE ENTORNO...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Render a veces escapa los saltos de línea como "\\n", esto lo arregla.
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://taxinort-96bc8-default-rtdb.firebaseio.com`
      });
      console.log("✅ [Firebase] Conectado vía Variables.");
    } 
    
    // 2. INTENTO: Archivo Local serviceAccountKey.json (Desarrollo Local)
    // Esto es lo que usará tu PC si creaste el archivo manualmente en la carpeta server.
    else {
      const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log("📂 [Firebase] Inicializando con ARCHIVO LOCAL (serviceAccountKey.json)...");
        // Leemos el archivo y obtenemos el project_id para la URL de la base de datos
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
          databaseURL: `https://taxinort-96bc8-default-rtdb.firebaseio.com`
        });
        console.log("✅ [Firebase] Conectado vía Archivo Local.");
      } else {
        console.warn("⚠️ [Firebase] No se encontraron credenciales (ni variables ni archivo local).");
        console.warn("   -> La geolocalización y funciones de Firebase NO funcionarán.");
      }
    }

  } catch (error) {
    console.error("❌ [Firebase] Error fatal al conectar:", error);
  }
}

// Exportamos la instancia de la base de datos solo si la app se inicializó correctamente
export const firebaseDb = admin.apps.length ? admin.database() : null;