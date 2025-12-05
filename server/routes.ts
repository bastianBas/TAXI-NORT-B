import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, verifyAuth } from "./auth";
import { seedData } from "./seed";
import type { VehicleLocation, User } from "@shared/schema";
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Middleware auxiliar para verificar roles usando la info del Token
function hasRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    
    if (!user) return res.status(401).json({ message: "No autenticado" });
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Seed en segundo plano
  seedData().catch(console.error);

  // --- RUTA DE EMERGENCIA (RESET ADMIN) ---
  app.get("/api/emergency-reset-admin", async (req, res) => {
    try {
      const email = "admin@taxinort.cl";
      const newPassword = "admin123";
      
      console.log(`🚨 RESTABLECIENDO contraseña para ${email}...`);

      const existing = await storage.getUserByEmail(email);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      if (!existing) {
        await storage.createUser({
          name: "Administrador Principal",
          email,
          password: hashedPassword,
          role: "admin"
        });
        return res.json({ status: "CREATED", message: "Usuario Admin creado. Usa: admin123" });
      } else {
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

  // --- RUTAS API PROTEGIDAS POR JWT ---
  
  // Drivers
  app.get("/api/drivers", verifyAuth, async (req, res) => {
    const drivers = await storage.getAllDrivers();
    res.json(drivers);
  });

  app.post("/api/drivers", verifyAuth, hasRole("admin", "operator"), async (req, res) => {
    const driver = await storage.createDriver(req.body);
    res.json(driver);
  });

  app.put("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => {
    const driver = await storage.updateDriver(req.params.id, req.body);
    res.json(driver);
  });

  app.delete("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => {
    await storage.deleteDriver(req.params.id);
    res.json({ success: true });
  });

  // Vehicles
  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    const vehicles = await storage.getAllVehicles();
    res.json(vehicles);
  });

  app.post("/api/vehicles", verifyAuth, hasRole("admin", "operator"), async (req, res) => {
    const vehicle = await storage.createVehicle(req.body);
    res.json(vehicle);
  });

  // GPS Update (Pública o con token de dispositivo)
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

  // Route Slips
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
      const slips = await storage.getAllRouteSlips();
      res.json(slips);
  });
  
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
      const slip = await storage.createRouteSlip(req.body);
      res.json(slip);
  });

  // Payments
  app.get("/api/payments", verifyAuth, async (req, res) => {
      const payments = await storage.getAllPayments();
      res.json(payments);
  });

  app.post("/api/payments", verifyAuth, hasRole("admin", "finance"), upload.single("file"), async (req, res) => {
      const paymentData = { ...req.body, amount: parseInt(req.body.amount), proofOfPayment: req.file?.filename || "" };
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
  });

  const httpServer = createServer(app);
  return httpServer;
}