import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { seedData } from "./seed";
import type { User } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "No autenticado" });
}

function hasRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autenticado" });
    const user = req.user as User;
    if (!roles.includes(user.role)) return res.status(403).json({ message: "No tienes permisos" });
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Intentar seed en segundo plano
  seedData().catch(console.error);

  // --- RUTA DE EMERGENCIA (LA SOLUCIÓN) ---
  // Esta ruta fuerza el cambio de contraseña a 'admin123'
  app.get("/api/emergency-reset-admin", async (req, res) => {
    try {
      const email = "admin@taxinort.cl";
      const newPassword = "admin123";
      
      console.log(`🚨 RESTABLECIENDO contraseña para ${email}...`);

      // Encriptamos 'admin123' con la configuración REAL de este servidor
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Verificamos si existe
      const existing = await storage.getUserByEmail(email);

      if (!existing) {
        // Si no existe, lo creamos
        await storage.createUser({
          name: "Administrador Principal",
          email,
          password: hashedPassword,
          role: "admin"
        });
        return res.json({ status: "CREATED", message: "Usuario Admin creado. Usa: admin123" });
      } else {
        // Si existe (tu caso), SOBRESCRIBIMOS la contraseña
        await db.update(users)
          .set({ password: hashedPassword, role: "admin" })
          .where(eq(users.email, email));
          
        return res.json({ status: "RESET_SUCCESS", message: "Contraseña actualizada a: admin123" });
      }
    } catch (error) {
      console.error("Reset error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // --- RESTO DE RUTAS ---
  
  app.get("/api/drivers", isAuthenticated, async (req, res) => {
    const drivers = await storage.getAllDrivers();
    res.json(drivers);
  });

  app.post("/api/drivers", hasRole("admin", "operator"), async (req, res) => {
    const driver = await storage.createDriver(req.body);
    res.json(driver);
  });

  app.get("/api/vehicles", isAuthenticated, async (req, res) => {
    const vehicles = await storage.getAllVehicles();
    res.json(vehicles);
  });

  app.post("/api/vehicles", hasRole("admin", "operator"), async (req, res) => {
    const vehicle = await storage.createVehicle(req.body);
    res.json(vehicle);
  });

  app.post("/api/vehicles/:id/location", async (req, res) => {
     const { lat, lng, status } = req.body;
     if (!lat || !lng) return res.status(400).send("Faltan coordenadas");
     await storage.updateVehicleLocation({
       vehicleId: req.params.id,
       plate: "GPS-DEVICE", 
       lat, lng, status: status || "active", timestamp: Date.now()
     });
     res.json({ success: true });
  });

  app.get("/api/route-slips", isAuthenticated, async (req, res) => {
      const slips = await storage.getAllRouteSlips();
      res.json(slips);
  });
  
  app.post("/api/route-slips", isAuthenticated, async (req, res) => {
      const slip = await storage.createRouteSlip(req.body);
      res.json(slip);
  });

  app.get("/api/payments", isAuthenticated, async (req, res) => {
      const payments = await storage.getAllPayments();
      res.json(payments);
  });

  app.post("/api/payments", hasRole("admin", "finance"), upload.single("file"), async (req, res) => {
      // Simplificado para evitar errores de validación aquí, la lógica real está en storage
      const paymentData = { ...req.body, amount: parseInt(req.body.amount), proofOfPayment: req.file?.filename || "" };
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
  });

  const httpServer = createServer(app);
  return httpServer;
}