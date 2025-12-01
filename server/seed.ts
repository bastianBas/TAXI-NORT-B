import { storage } from "./storage";
import bcrypt from "bcrypt";
import type { InsertUser } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedData() {
  const email = "admin@taxinort.cl"; // Correo oficial
  const password = "admin123";       // Contraseña oficial
  
  console.log("🌱 Verificando integridad del usuario administrador...");

  try {
    // 1. Buscamos si el usuario ya existe
    const existingUser = await storage.getUserByEmail(email);
    
    // 2. Preparamos la contraseña encriptada (Hash)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (!existingUser) {
      // CASO 1: No existe, lo creamos de cero
      console.log("🌱 Admin no encontrado. Creando nuevo...");
      
      const adminUser: InsertUser = {
        name: "Administrador Principal",
        email: email,
        password: hashedPassword,
        role: "admin",
      };

      await storage.createUser(adminUser);
      console.log("✅ Usuario creado exitosamente.");
    } else {
      // CASO 2: Ya existe, ACTUALIZAMOS su contraseña
      // Esto arregla el problema de "Credenciales inválidas" si la BD tenía una clave vieja
      console.log("ℹ️ Admin encontrado. Actualizando contraseña para asegurar acceso...");
      
      await db.update(users)
        .set({ 
            password: hashedPassword,
            role: "admin" // Aseguramos también que siga siendo admin
        })
        .where(eq(users.email, email));
        
      console.log("✅ Credenciales de admin actualizadas a 'admin123'.");
    }
  } catch (error) {
    console.error("❌ Error crítico en seedData:", error);
  }
}
