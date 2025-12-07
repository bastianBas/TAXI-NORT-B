import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_secret_key";

// Middleware para verificar Token (Header Authorization o Cookie)
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token;

  // 1. Intentar leer del Header "Authorization: Bearer <token>"
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } 
  // 2. Fallback: Intentar leer de la cookie (por si acaso)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "No autenticado (Falta token)" });
  }

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

// Extender tipos de Express
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

      // Verificación de contraseña con bcrypt
      const isValid = await bcrypt.compare(req.body.password, user.password);
      if (!isValid) {
        console.log("❌ Contraseña incorrecta");
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // Crear Token (Dura 30 días)
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

      console.log(`✅ [Login] Éxito. Token generado.`);
      const { password, ...userWithoutPassword } = user;
      
      // Enviamos el token al frontend (JSON) y en Cookie (backup)
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // IMPORTANTE: 'false' para evitar problemas con proxies que terminan SSL en Cloud Run
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      
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

      // Cookie backup
      res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Error en registro" });
    }
  });

  // LOGOUT (El cliente borra el token)
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
  });

  // OBTENER USUARIO (Requiere token)
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = (req as any).user;
    res.json(userWithoutPassword);
  });
}