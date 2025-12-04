import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_super_secret";

// Middleware para verificar JWT
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  // Intentar leer el token de la cookie
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "No autenticado (Sin token)" });
  }

  try {
    // Verificar y decodificar token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    // Buscar usuario en DB
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "Usuario inválido" });
    }

    // Inyectar usuario en la request
    (req as any).user = user;
    (req as any).isAuthenticated = () => true;
    next();
  } catch (error) {
    console.error("JWT Error:", error);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

// Extender tipos de Express para TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

export function setupAuth(app: Express) {
  // --- RUTAS DE AUTENTICACIÓN ---

  // Registro
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

      // Crear Token JWT
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // Enviar Cookie (Configuración ULTRA compatible)
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // Para evitar problemas con proxies que terminan SSL
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (err) {
      res.status(500).json({ message: "Error en registro" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      console.log(`🔍 [JWT Login] Intentando: ${email}`);
      
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

      // Crear Token JWT
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // Enviar Cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // Importante para Cloud Run
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });

      console.log(`✅ [JWT Login] Éxito para ${email}`);
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Error interno" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token"); // Borrar la cookie
    res.sendStatus(200);
  });

  // User info (Usando middleware verifyAuth)
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // Middleware global para inyectar usuario en otras rutas
  app.use("/api/*", async (req, res, next) => {
    if (req.path.startsWith("/api/auth") || req.path === "/api/user") return next();
    
    const token = req.cookies?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
            const user = await storage.getUser(decoded.id);
            if (user) {
                req.user = user;
                req.isAuthenticated = () => true;
            } else {
                req.isAuthenticated = () => false;
            }
        } catch {
            req.isAuthenticated = () => false;
        }
    } else {
        req.isAuthenticated = () => false;
    }
    next();
  });
}