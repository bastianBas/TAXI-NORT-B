import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_secret_key";

// Middleware para verificar Token (Header Authorization)
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // Buscamos el token en el header "Authorization: Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autenticado (Falta token)" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "Usuario inválido" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token expirado o inválido" });
  }
}

// Extender tipos
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function setupAuth(app: Express) {
  
  // LOGIN: Genera y devuelve el token
  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      console.log(`🔍 [Login] Intentando: ${email}`);
      
      const user = await storage.getUserByEmail(email);

      if (!user) {
        console.log("❌ Usuario no encontrado");
        return res.status(401).json({ message: "Usuario no encontrado" });
      }

      const isValid = await bcrypt.compare(req.body.password, user.password);
      if (!isValid) {
        console.log("❌ Contraseña incorrecta");
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // Crear Token (Dura 30 días)
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

      console.log(`✅ [Login] Éxito. Token generado.`);
      const { password, ...userWithoutPassword } = user;
      
      // Enviamos el token al frontend
      res.json({ user: userWithoutPassword, token });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Error interno" });
    }
  });

  // REGISTRO
  app.post("/api/auth/register", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = await storage.createUser({
        name: req.body.name,
        email: email,
        password: hashedPassword,
        role: "driver" 
      });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Error en registro" });
    }
  });

  // LOGOUT (El cliente borra el token)
  app.post("/api/auth/logout", (req, res) => {
    res.sendStatus(200);
  });

  // OBTENER USUARIO (Requiere token)
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = (req as any).user;
    res.json(userWithoutPassword);
  });
}