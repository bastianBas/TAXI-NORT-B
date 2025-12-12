import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, verifyAuth } from "./auth";
import { seedData } from "./seed";
import type { User, RouteSlip } from "@shared/schema"; // 🟢 Importar RouteSlip
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

async function logAudit(req: Request, action: string, entity: string, entityId: string, details: string) {
  try {
    const user = (req as any).user as User;
    if (user) {
      await storage.createAuditLog({
        userId: user.id,
        userName: user.name,
        action: action.toUpperCase(),
        entity: entity,
        entityId: entityId,
        details: details
      });
    }
  } catch (error) {
    console.error("Error creando log de auditoría:", error);
  }
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

  // --- CONDUCTORES ---
  app.get("/api/drivers", verifyAuth, async (req, res) => { res.json(await storage.getAllDrivers()); });
  
  app.post("/api/drivers", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const driver = await storage.createDriver(req.body);
    await logAudit(req, "CREATE", "Conductor", driver.id, `Creación de conductor: ${driver.name}`);
    res.json(driver); 
  });
  
  app.put("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const driver = await storage.updateDriver(req.params.id, req.body);
    if (driver) {
      await logAudit(req, "UPDATE", "Conductor", driver.id, `Actualización de conductor: ${driver.name}`);
    }
    res.json(driver); 
  });
  
  app.delete("/api/drivers/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const driver = await storage.getDriver(req.params.id);
    await storage.deleteDriver(req.params.id); 
    await logAudit(req, "DELETE", "Conductor", req.params.id, `Eliminación de conductor: ${driver?.name || 'Desconocido'}`);
    res.json({ success: true }); 
  });

  // --- VEHÍCULOS ---
  app.get("/api/vehicles", verifyAuth, async (req, res) => { res.json(await storage.getAllVehicles()); });
  
  app.post("/api/vehicles", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const vehicle = await storage.createVehicle(req.body);
    await logAudit(req, "CREATE", "Vehículo", vehicle.id, `Registro de vehículo: ${vehicle.plate}`);
    res.json(vehicle); 
  });
  
  app.put("/api/vehicles/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const vehicle = await storage.updateVehicle(req.params.id, req.body);
    if (vehicle) {
      await logAudit(req, "UPDATE", "Vehículo", vehicle.id, `Actualización de vehículo: ${vehicle.plate}`);
    }
    res.json(vehicle); 
  });
  
  app.delete("/api/vehicles/:id", verifyAuth, hasRole("admin", "operator"), async (req, res) => { 
    const vehicle = await storage.getVehicle(req.params.id);
    await storage.deleteVehicle(req.params.id); 
    await logAudit(req, "DELETE", "Vehículo", req.params.id, `Eliminación de vehículo: ${vehicle?.plate || 'Desconocido'}`);
    res.json({ success: true }); 
  });
  
  app.post("/api/vehicles/:id/location", async (req, res) => { 
    await storage.updateVehicleLocation({ vehicleId: req.params.id, plate: "GPS", lat: req.body.lat, lng: req.body.lng, status: "active", timestamp: Date.now() }); 
    res.json({ success: true }); 
  });

  // --- HOJAS DE RUTA ---
  app.get("/api/route-slips", verifyAuth, async (req, res) => { res.json(await storage.getAllRouteSlips()); });
  
  app.post("/api/route-slips", verifyAuth, upload.single("signature"), async (req, res) => { 
    const slipData = { ...req.body, signatureUrl: req.file ? req.file.filename : null };
    const slip = await storage.createRouteSlip(slipData);
    await logAudit(req, "CREATE", "Hoja de Ruta", slip.id, `Control diario creado para fecha: ${slip.date}`);
    res.json(slip); 
  });

  app.put("/api/route-slips/:id", verifyAuth, hasRole("admin", "operator"), upload.single("signature"), async (req, res) => {
    const slipData = { ...req.body };
    if (req.file) {
        slipData.signatureUrl = req.file.filename;
    }
    const slip = await storage.updateRouteSlip(req.params.id, slipData);
    if (slip) {
      await logAudit(req, "UPDATE", "Hoja de Ruta", slip.id, `Modificación de Control diario: ${slip.date}`);
    }
    res.json(slip);
  });

  // --- PAGOS (MODIFICADO) ---
  app.get("/api/payments", verifyAuth, async (req, res) => { res.json(await storage.getAllPayments()); });
  
  // 🟢 CAMBIO: Permitir que 'driver' también haga POST
  app.post("/api/payments", verifyAuth, hasRole("admin", "finance", "driver"), upload.single("file"), async (req, res) => { 
      const user = (req as any).user as User;
      const slipId = req.body.routeSlipId;

      // 🟢 LÓGICA DE SEGURIDAD PARA CONDUCTORES
      // Si no es admin/finanzas, verificamos que la Hoja de Ruta sea SUYA
      if (user.role === "driver") {
        const slip = await storage.getRouteSlip(slipId);
        if (!slip) return res.status(404).json({ message: "Hoja de ruta no encontrada" });

        const driverInfo = await storage.getDriver(slip.driverId);
        // Verificamos que el userId del conductor coincida con el usuario logueado
        if (driverInfo?.userId !== user.id) {
            return res.status(403).json({ message: "No puedes pagar una hoja de ruta que no te pertenece." });
        }
      }

      const paymentData = { ...req.body, amount: parseInt(req.body.amount || "1800"), proofOfPayment: req.file?.filename || "" };
      const payment = await storage.createPayment(paymentData);
      await logAudit(req, "CREATE", "Pago", payment.id, `Registro de pago diario ($${payment.amount})`);
      res.json(payment); 
  });

  app.put("/api/payments/:id", verifyAuth, hasRole("admin", "finance"), upload.single("file"), async (req, res) => {
    const paymentData = { ...req.body };
    if (paymentData.amount) paymentData.amount = parseInt(paymentData.amount);
    if (req.file) {
        paymentData.proofOfPayment = req.file.filename;
    }
    const payment = await storage.updatePayment(req.params.id, paymentData);
    if (payment) {
      await logAudit(req, "UPDATE", "Pago", payment.id, `Actualización de pago ID: ${payment.id.substring(0,8)}...`);
    }
    res.json(payment);
  });

  // --- AUDITORÍA ---
  app.get("/api/audit", verifyAuth, hasRole("admin"), async (req, res) => { 
    res.json(await storage.getAllAuditLogs()); 
  });

  const httpServer = createServer(app);
  return httpServer;
}