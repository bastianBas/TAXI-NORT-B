// server/seed.ts
import { storage } from "./storage";
import bcrypt from "bcrypt";
import type { InsertUser } from "@shared/schema";

export async function seedData() {
  const email = "admin@taxinort.cl"; // <--- ESTE ES EL CORREO EXACTO
  
  // Verificamos si ya existe el admin
  const existingUser = await storage.getUserByEmail(email);
  
  if (!existingUser) {
    console.log("🌱 Creando usuario administrador inicial...");
    const hashedPassword = await bcrypt.hash("admin123", 10); // <--- ESTA ES LA CONTRASEÑA
    
    const adminUser: InsertUser = {
      name: "Administrador Principal",
      email: email,
      password: hashedPassword,
      role: "admin",
    };

    await storage.createUser(adminUser);
    console.log("✅ Usuario creado: admin@taxinort.cl / admin123");
  } else {
    console.log("ℹ️ El usuario administrador ya existe.");
  }
}