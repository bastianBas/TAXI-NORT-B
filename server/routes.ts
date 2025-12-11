import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, verifyAuth } from "./auth";
import { seedData } from "./seed";
import type { User } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs"; // Importación correcta

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

function hasRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user) return res.status(401).json({ message: "No autenticado" });
    if (!roles.includes(user.role)) return res.status(403).json({ message: "No tienes permisos" });
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  seedData().catch(console.error);

  app.get("/api/emergency-reset-admin", async (req, res) => {
    try {
      const email = "admin@taxinort.cl";
      const newPassword = "admin123";
      console.log(`🚨 RESTABLECIENDO contraseña para ${email}...`);
      const existing = await storage.getUserByEmail(email);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      if (!existing) {
        await storage.createUser({ name: "Administrador", email, password: hashedPassword, role: "admin" });
        return res.json({ status: "CREATED", message: "Admin creado" });
      } else {
        await db.update(users).set({ password: hashedPassword, role: "admin" }).where(eq(users.email, email));
        return res.json({ status: "RESET_SUCCESS", message: "Contraseña reseteada" });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/drivers", verifyAuth, async (req, res) => { res.json(await storage.getAllDrivers()); });
  app.post("/api/drivers", verifyAuth, hasRole("admin", "operator"), async (req, res) => { res.json(await storage.createDriver(req.body)); });
  app.put("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { res.json(await storage.updateDriver(req.params.id, req.body)); });
  app.delete("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { await storage.deleteDriver(req.params.id); res.json({ success: true }); });

  app.get("/api/vehicles", verifyAuth, async (req, res) => { res.json(await storage.getAllVehicles()); });
  app.post("/api/vehicles", verifyAuth, hasRole("admin", "operator"), async (req, res) => { res.json(await storage.createVehicle(req.body)); });
  app.post("/api/vehicles/:id/location", async (req, res) => { await storage.updateVehicleLocation({ vehicleId: req.params.id, plate: "GPS", lat: req.body.lat, lng: req.body.lng, status: "active", timestamp: Date.now() }); res.json({ success: true }); });

  app.get("/api/route-slips", verifyAuth, async (req, res) => { res.json(await storage.getAllRouteSlips()); });
  app.post("/api/route-slips", verifyAuth, async (req, res) => { res.json(await storage.createRouteSlip(req.body)); });

  app.get("/api/payments", verifyAuth, async (req, res) => { res.json(await storage.getAllPayments()); });
  app.post("/api/payments", verifyAuth, hasRole("admin", "finance"), upload.single("file"), async (req, res) => { 
      const payment = await storage.createPayment({ ...req.body, amount: parseInt(req.body.amount), proofOfPayment: req.file?.filename || "" });
      res.json(payment); 
  });

  app.get("/api/audit", verifyAuth, hasRole("admin"), async (req, res) => { res.json(await storage.getAllAuditLogs()); });

  const httpServer = createServer(app);
  return httpServer;
}