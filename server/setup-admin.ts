import { db } from "./db";
import { users } from "@shared/schema";
import { randomUUID, scryptSync, randomBytes } from "crypto";
import { eq } from "drizzle-orm";

// Esta función replica exactamente el comportamiento de tu auth.ts
function generateHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function createEmergencyAdmin() {
  const adminEmail = "admin@taxinort.cl";
  const pass = "admin123";
  
  try {
    console.log("Iniciando creación de admin de emergencia...");
    
    // 1. Borrar si ya existe para evitar errores
    await db.delete(users).where(eq(users.email, adminEmail));
    
    // 2. Generar el hash compatible con tu sistema
    const hashedPassword = generateHash(pass);
    
    // 3. Insertar en la base de datos
    await db.insert(users).values({
      id: randomUUID(),
      email: adminEmail,
      password: hashedPassword,
      name: "Administrador TaxiNort",
      role: "admin",
      createdAt: new Date(),
    });

    console.log("--------------------------------------");
    console.log("✅ ADMIN CREADO EXITOSAMENTE");
    console.log(`URL: https://taxinort-app-985056328297.southamerica-west1.run.app`);
    console.log(`Usuario: ${adminEmail}`);
    console.log(`Password: ${pass}`);
    console.log("--------------------------------------");
  } catch (error) {
    console.error("❌ Error creando admin:", error);
  }
}