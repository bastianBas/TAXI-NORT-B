import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_secret";

export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: "No autenticado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await storage.getUser(decoded.id);
    if (!user) return res.status(401).json({ message: "Usuario inválido" });
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

declare global { namespace Express { interface Request { user?: User; } } }

export function setupAuth(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      const user = await storage.getUserByEmail(email);

      if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax" });
      
      const { password, ...userData } = user;
      res.json({ user: userData, token });
    } catch (err) {
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const email = req.body.email.trim().toLowerCase();
      if (await storage.getUserByEmail(email)) {
        return res.status(400).json({ message: "Email registrado" });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = await storage.createUser({
        name: req.body.name,
        email,
        password: hashedPassword,
        role: "driver"
      });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax" });

      const { password, ...userData } = user;
      res.status(201).json({ user: userData, token });
    } catch (err) {
      res.status(500).json({ message: "Error registro" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
  });

  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userData } = (req as any).user;
    res.json(userData);
  });
}