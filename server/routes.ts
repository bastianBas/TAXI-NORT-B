import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth";
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Servir imágenes
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // ==========================================
  // 🚨 RUTA DE EMERGENCIA (RESET ADMIN) 🚨
  // ==========================================
  app.post("/api/emergency-reset-admin", async (req, res) => {
    try {
      // 1. Verificar si ya existe
      const existingAdmin = await db.query.users.findFirst({
        where: eq(users.email, "admin@taxinort.cl")
      });

      if (existingAdmin) {
        return res.json({ message: "El admin ya existe. Intenta iniciar sesión." });
      }

      // 2. Crear Admin
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const newAdmin = {
        id: randomUUID(),
        email: "admin@taxinort.cl",
        password: hashedPassword,
        name: "Administrador Principal",
        role: "admin",
        createdAt: new Date(),
      };

      await db.insert(users).values(newAdmin);
      console.log("✅ Admin de emergencia creado: admin@taxinort.cl / admin123");
      res.json({ message: "Admin creado exitosamente", credentials: "admin@taxinort.cl / admin123" });

    } catch (error) {
      console.error("Error reset admin:", error);
      res.status(500).send("Error creando admin");
    }
  });

  // ==========================================
  // API: HOJAS DE RUTA
  // ==========================================

  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    if (!req.user) return res.status(401).send("No autorizado");
    try {
      if (req.user.role === 'admin') {
        const allSlips = await db.query.routeSlips.findMany({
          with: { driver: true, vehicle: true },
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        return res.json(allSlips);
      }
      if (req.user.role === 'driver') {
        const driverProfile = await db.query.drivers.findFirst({
          where: eq(drivers.userId, req.user.id),
        });
        if (!driverProfile) return res.json([]);
        const driverSlips = await db.query.routeSlips.findMany({
          where: eq(routeSlips.driverId, driverProfile.id),
          with: { driver: true, vehicle: true },
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        return res.json(driverSlips);
      }
      return res.json([]);
    } catch (error) {
      console.error("Error route-slips:", error);
      res.status(500).json([]);
    }
  });

  app.post("/api/route-slips", verifyAuth, upload.single('signature'), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const newId = randomUUID();
      let signatureUrl = null;
      if (req.file) signatureUrl = `uploads/${req.file.filename}`;

      const slipData = {
        id: newId,
        date: req.body.date,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes || "",
        signatureUrl: signatureUrl,
        paymentStatus: 'pending',
        isDuplicate: false,
        createdAt: new Date(),
      };

      await db.insert(routeSlips).values(slipData);
      res.status(201).json(slipData);
    } catch (error) {
      console.error("Error crear hoja:", error);
      res.status(500).send("Error al crear");
    }
  });

  app.put("/api/route-slips/:id", verifyAuth, upload.single('signature'), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const updateData: any = {
        date: req.body.date,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes
      };
      if (req.file) updateData.signatureUrl = `uploads/${req.file.filename}`;

      await db.update(routeSlips).set(updateData).where(eq(routeSlips.id, req.params.id));
      res.json({ message: "Actualizado" });
    } catch (error) {
      res.status(500).send("Error al actualizar");
    }
  });

  // ==========================================
  // API: CONDUCTORES (Drivers)
  // ==========================================

  app.get("/api/drivers", verifyAuth, async (req, res) => {
    const allDrivers = await db.query.drivers.findMany({
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
    res.json(allDrivers);
  });

  app.post("/api/drivers", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    
    try {
      const { email, name, rut, ...otherData } = req.body;

      // 1. Validar duplicados
      const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existingUser) return res.status(400).json({ message: "El email ya existe" });

      // 2. Crear Usuario
      const newUserId = randomUUID();
      const hashedPassword = await bcrypt.hash("123456", 10); // Pass por defecto

      await db.insert(users).values({
        id: newUserId,
        email,
        password: hashedPassword,
        name,
        role: 'driver',
        createdAt: new Date(),
      });

      // 3. Crear Conductor
      const newDriverId = randomUUID();
      const driverData = {
        id: newDriverId,
        userId: newUserId,
        email,
        name,
        rut,
        ...otherData,
        createdAt: new Date(),
        status: req.body.status || 'active'
      };

      await db.insert(drivers).values(driverData);
      res.status(201).json(driverData);

    } catch (error) {
      console.error("Error creando conductor:", error);
      res.status(500).send("Error al crear conductor");
    }
  });

  app.put("/api/drivers/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id));
      res.json({ message: "Conductor actualizado" });
    } catch (error) {
      res.status(500).send("Error al actualizar conductor");
    }
  });

  // 🔴 ELIMINAR CONDUCTOR (NUEVO)
  app.delete("/api/drivers/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const driverId = req.params.id;

      // 1. Buscar al conductor para obtener su ID de usuario
      const driver = await db.query.drivers.findFirst({
        where: eq(drivers.id, driverId)
      });

      if (!driver) return res.status(404).send("Conductor no encontrado");

      // 2. Eliminar de la tabla drivers
      await db.delete(drivers).where(eq(drivers.id, driverId));

      // 3. Si tiene un usuario asociado, eliminarlo también (para que no quede el login huerfano)
      if (driver.userId) {
        await db.delete(users).where(eq(users.id, driver.userId));
      }

      res.json({ message: "Conductor y usuario eliminados correctamente" });
    } catch (error) {
      console.error("Error eliminando conductor:", error);
      res.status(500).send("Error al eliminar");
    }
  });

  // ==========================================
  // API: VEHÍCULOS (Vehicles)
  // ==========================================

  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    const allVehicles = await db.query.vehicles.findMany();
    res.json(allVehicles);
  });

  app.post("/api/vehicles", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const newId = randomUUID();
      const vehicleData = {
        ...req.body,
        id: newId,
        createdAt: new Date(),
        status: req.body.status || 'active'
      };
      await db.insert(vehicles).values(vehicleData);
      res.status(201).json(vehicleData);
    } catch (error) {
      console.error("Error creando vehículo:", error);
      res.status(500).send("Error al crear vehículo");
    }
  });

  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id));
      res.json({ message: "Vehículo actualizado" });
    } catch (error) {
      res.status(500).send("Error al actualizar vehículo");
    }
  });

  // 🔴 ELIMINAR VEHÍCULO (NUEVO)
  app.delete("/api/vehicles/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      await db.delete(vehicles).where(eq(vehicles.id, req.params.id));
      res.json({ message: "Vehículo eliminado" });
    } catch (error) {
      console.error("Error eliminando vehículo:", error);
      res.status(500).send("Error al eliminar");
    }
  });

  // ==========================================
  // API: PAGOS
  // ==========================================
  
  app.get("/api/payments", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      if (req.user.role === 'admin') {
        const all = await db.query.payments.findMany({
          with: { routeSlip: true },
          orderBy: (p, { desc }) => [desc(p.date)],
        });
        return res.json(all);
      } 
      if (req.user.role === 'driver') {
        const driverProfile = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
        if (!driverProfile) return res.json([]);
        const mySlips = await db.query.routeSlips.findMany({ where: eq(routeSlips.driverId, driverProfile.id) });
        const slipIds = mySlips.map(s => s.id);
        if (slipIds.length === 0) return res.json([]);
        const all = await db.query.payments.findMany({ with: { routeSlip: true }, orderBy: (p, { desc }) => [desc(p.date)] });
        return res.json(all.filter(p => p.routeSlipId && slipIds.includes(p.routeSlipId)));
      }
      return res.json([]);
    } catch (error) {
      res.status(500).json([]);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}