import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { type User } from "@shared/schema";

export function setupAuth(app: Express) {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // LIMPIEZA DE DATOS (Crucial para evitar errores de tipeo)
          const cleanEmail = email.toLowerCase().trim();
          
          console.log(`🔍 [Login] Intentando ingresar con: '${cleanEmail}'`);
          
          // Buscamos el usuario
          let user = await storage.getUserByEmail(cleanEmail);
          
          // INTENTO DE RESCATE: Si no lo encuentra, buscamos sin convertir a minúsculas
          // por si en la base de datos se guardó con mayúsculas por error antiguo.
          if (!user && cleanEmail !== email) {
             console.log(`⚠️ [Login] No encontrado como minúscula. Probando original: '${email}'`);
             user = await storage.getUserByEmail(email);
          }

          if (!user) {
            console.log(`❌ [Login] Usuario NO EXISTE en la base de datos.`);
            return done(null, false, { message: "Usuario no encontrado" });
          }

          // Verificar contraseña
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.log(`❌ [Login] Contraseña incorrecta para: ${cleanEmail}`);
            return done(null, false, { message: "Credenciales inválidas" });
          }

          console.log(`✅ [Login] ¡Éxito! Usuario autenticado: ${user.id}`);
          return done(null, user);
        } catch (err) {
          console.error("❌ [Login] Error interno:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
         // Si el usuario se borró de la DB mientras tenía sesión, evitamos error
         return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- RUTAS ---

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      // Guardamos siempre en minúsculas y sin espacios
      const cleanEmail = req.body.email.toLowerCase().trim();
      
      const existingUser = await storage.getUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      
      const user = await storage.createUser({
        name: req.body.name,
        email: cleanEmail,
        password: hashedPassword,
        role: "driver" 
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Forzamos guardado de sesión
        req.session.save((err) => {
            if (err) console.error("Error guardando sesión registro:", err);
            const { password, ...userWithoutPassword } = user;
            res.status(201).json({ user: userWithoutPassword });
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Error de autenticación" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Forzamos guardado de sesión antes de responder
        req.session.save((err) => {
          if (err) console.error("Error guardando sesión login:", err);
          const { password, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.save(() => {
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autenticado" });
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}
