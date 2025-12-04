import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_super_secret";

// Middleware para verificar JWT desde Header
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  // Buscamos el token en el header "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Si no hay header, intentamos leer cookie por compatibilidad (opcional)
    if (req.cookies && req.cookies.token) {
       // Lógica de fallback cookie
    } else {
       return res.status(401).json({ message: "No autenticado (Falta token)" });
    }
  }

  const token = authHeader?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Token vacío" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "Usuario inválido" });
    }

    (req as any).user = user;
    (req as any).isAuthenticated = () => true;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

export function setupAuth(app: Express) {
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

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // DEVOLVEMOS EL TOKEN EN EL JSON (Para que el frontend lo guarde)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ message: "Error en registro" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }

      const isValid = await bcrypt.compare(req.body.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // DEVOLVEMOS EL TOKEN EN EL JSON
      console.log(`✅ [Login] Token generado para ${email}`);
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Error interno" });
    }
  });

  // Logout (Frontend debe borrar el token)
  app.post("/api/auth/logout", (req, res) => {
    res.sendStatus(200);
  });

  // User info
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // Middleware global
  app.use("/api/*", async (req, res, next) => {
    if (req.path.startsWith("/api/auth") || req.path === "/api/user") return next();
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // Bearer <token>

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