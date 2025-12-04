import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { type User } from "@shared/schema";

export function setupAuth(app: Express) {
  // 1. Configuración de Passport
  passport.use(
    new LocalStrategy(
      { usernameField: "email" }, // IMPORTANTE: Le decimos que usamos 'email' en lugar de 'username'
      async (email, password, done) => {
        try {
          const cleanEmail = email.trim();
          console.log(`🔍 [Login] Intentando: ${cleanEmail}`);
          
          const user = await storage.getUserByEmail(cleanEmail);
          if (!user) {
            console.log(`❌ [Login] Usuario no encontrado.`);
            return done(null, false, { message: "Usuario no encontrado" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.log(`❌ [Login] Password incorrecto.`);
            return done(null, false, { message: "Credenciales inválidas" });
          }

          console.log(`✅ [Login] Éxito.`);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false); // Si no existe, devuelve false
    } catch (err) {
      done(err);
    }
  });

  // --- RUTAS ---

  // Registro
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const email = req.body.email.trim();
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

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword });
      });
    } catch (err) {
      next(err);
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Error de autenticación" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session = null; // Limpiar cookie
      res.sendStatus(200);
    });
  });

  // Obtener usuario actual
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autenticado" });
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}