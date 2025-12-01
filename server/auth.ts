import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_super_secret";

// Middleware para verificar JWT
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  // 1. Verificación de seguridad: si no hay cookies parseadas, no hay token.
  if (!req.cookies) {
    return res.status(401).json({ message: "No autenticado (Sin cookies)" });
  }

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "Usuario inválido" });
    }

    // Agregamos el usuario a la request para usarlo en otras rutas
    (req as any).user = user;
    (req as any).isAuthenticated = () => true;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

// Extender el tipo de Request para TS
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

      // Crear token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // Enviar cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // True en Render
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
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }

      const isValid = await bcrypt.compare(req.body.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // Crear token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

      // Enviar cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // True en Render
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
    res.clearCookie("token");
    res.sendStatus(200);
  });

  // User info (Protegido con el middleware verifyAuth)
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // APLICAR MIDDLEWARE GLOBALMENTE para que req.user exista en las otras rutas
  // (Esto es un truco para no reescribir routes.ts completo)
  app.use("/api/*", (req, res, next) => {
    // Si la ruta ya empieza por /api/auth, no hacemos nada (ya se maneja arriba)
    if (req.path.startsWith("/api/auth")) return next();
    
    // Intentar leer el token si existe
    if (req.cookies && req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, JWT_SECRET) as { id: string };
            storage.getUser(decoded.id).then(user => {
                if (user) {
                    req.user = user;
                    req.isAuthenticated = () => true;
                } else {
                    req.isAuthenticated = () => false;
                }
                next();
            }).catch(() => {
                req.isAuthenticated = () => false;
                next();
            });
        } catch {
            req.isAuthenticated = () => false;
            next();
        }
    } else {
        req.isAuthenticated = () => false;
        next();
    }
  });
}