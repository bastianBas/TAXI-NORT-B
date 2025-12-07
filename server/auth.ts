import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { type User } from "@shared/schema";

// Clave secreta para firmar el token. Si no está en .env, usa un valor por defecto.
const JWT_SECRET = process.env.SESSION_SECRET || "taxinort_jwt_secret_key";

// --- MIDDLEWARE DE VERIFICACIÓN DE TOKEN ---
// Este middleware protege las rutas. Busca el token en el Header o en la Cookie.
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token;

  // 1. Prioridad: Buscar en el Header "Authorization: Bearer <token>"
  // Este es el método más robusto para SPAs y móviles.
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } 
  // 2. Respaldo: Buscar en la cookie "token"
  // Útil si el cliente web no envió el header por alguna razón.
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Si no hay token en ningún lado, rechazamos la petición.
  if (!token) {
    return res.status(401).json({ message: "No autenticado (Falta token)" });
  }

  try {
    // Verificamos que el token sea válido y no haya expirado
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    // Buscamos al usuario en la base de datos usando el ID del token
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "Usuario inválido o eliminado" });
    }

    // Inyectamos el usuario en la request para que las rutas puedan usarlo
    (req as any).user = user;
    next();
  } catch (error) {
    // Si el token es falso o expiró
    return res.status(401).json({ message: "Token expirado o inválido" });
  }
}

// Extendemos los tipos de Express para que TypeScript reconozca req.user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// --- CONFIGURACIÓN DE RUTAS DE AUTENTICACIÓN ---
export function setupAuth(app: Express) {
  
  // LOGIN: Valida credenciales y devuelve el token
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Normalizamos el email a minúsculas y sin espacios
      const email = req.body.email.trim().toLowerCase();
      console.log(`🔍 [Login] Intentando: ${email}`);
      
      const user = await storage.getUserByEmail(email);

      // Si no existe el usuario
      if (!user) {
        console.log("❌ Usuario no encontrado");
        return res.status(401).json({ message: "Usuario no encontrado" });
      }

      // Si la contraseña no coincide
      const isValid = await bcrypt.compare(req.body.password, user.password);
      if (!isValid) {
        console.log("❌ Contraseña incorrecta");
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // GENERAR TOKEN (Válido por 30 días)
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

      console.log(`✅ [Login] Éxito para ${email}. Token generado.`);
      
      // Enviamos la cookie como respaldo (configuración segura pero compatible)
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // Importante: 'false' evita problemas con proxies que terminan SSL en Cloud Run
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
      });

      const { password, ...userWithoutPassword } = user;
      
      // DEVOLVEMOS EL TOKEN EN EL JSON
      // Esto permite que el cliente lo guarde en localStorage
      res.json({ user: userWithoutPassword, token });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // REGISTRO: Crea usuario y devuelve token
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
        role: "driver" // Rol fijo por seguridad
      });

      // Generar token automáticamente tras registro
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });

  // LOGOUT: Limpia la cookie (el cliente debe borrar el localStorage)
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
  });

  // OBTENER USUARIO ACTUAL: Requiere token válido
  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = (req as any).user;
    res.json(userWithoutPassword);
  });
}