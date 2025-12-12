import { storage } from "./storage";
import bcrypt from "bcryptjs"; // 🟢 CORRECCIÓN: Importación por defecto
import type { InsertUser } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedData() {
  const email = "admin@taxinort.cl";
  const password = "admin123";
  
  console.log("🌱 Verificando integridad del usuario administrador...");

  try {
    const existingUser = await storage.getUserByEmail(email);
    // Ahora sí funcionará porque 'bcrypt' es el objeto correcto
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (!existingUser) {
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
      console.log("ℹ️ Admin encontrado. Actualizando contraseña...");
      await db.update(users)
        .set({ password: hashedPassword, role: "admin" })
        .where(eq(users.email, email));
      console.log("✅ Credenciales de admin actualizadas a 'admin123'.");
    }
  } catch (error) {
    console.error("❌ Error en seedData:", error);
  }
}