import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth";
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// --- CONFIGURACIÓN DE SUBIDA DE IMÁGENES (MULTER) ---
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

  // Servir carpeta de imágenes
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // ==========================================
  // API: HOJAS DE RUTA (Route Slips)
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
      console.error("Error obteniendo hojas de ruta:", error);
      res.status(500).json([]);
    }
  });

  // CREAR HOJA DE RUTA (Con imagen)
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
        createdAt: new Date(), // Generamos fecha compatible
      };

      await db.insert(routeSlips).values(slipData);
      res.status(201).json(slipData);
    } catch (error) {
      console.error("Error creando hoja:", error);
      res.status(500).send("Error al crear");
    }
  });

  // EDITAR HOJA DE RUTA
  app.put("/api/route-slips/:id", verifyAuth, upload.single('signature'), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const slipId = req.params.id;
      const updateData: any = {
        date: req.body.date,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes
      };
      if (req.file) updateData.signatureUrl = `uploads/${req.file.filename}`;

      await db.update(routeSlips).set(updateData).where(eq(routeSlips.id, slipId));
      res.json({ message: "Actualizado", id: slipId });
    } catch (error) {
      console.error("Error actualizando hoja:", error);
      res.status(500).send("Error al actualizar");
    }
  });

  // ==========================================
  // API: CONDUCTORES (Drivers) - RESTAURADA
  // ==========================================

  app.get("/api/drivers", verifyAuth, async (req, res) => {
    const allDrivers = await db.query.drivers.findMany({
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
    res.json(allDrivers);
  });

  // CREAR CONDUCTOR (Faltaba esta ruta)
  app.post("/api/drivers", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const newId = randomUUID();
      const driverData = {
        ...req.body,
        id: newId,
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

  // EDITAR CONDUCTOR
  app.put("/api/drivers/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id));
      res.json({ message: "Conductor actualizado" });
    } catch (error) {
      res.status(500).send("Error al actualizar conductor");
    }
  });

  // ==========================================
  // API: VEHÍCULOS (Vehicles) - RESTAURADA
  // ==========================================

  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    const allVehicles = await db.query.vehicles.findMany();
    res.json(allVehicles);
  });

  // CREAR VEHÍCULO (Faltaba esta ruta)
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

  // EDITAR VEHÍCULO
  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id));
      res.json({ message: "Vehículo actualizado" });
    } catch (error) {
      res.status(500).send("Error al actualizar vehículo");
    }
  });

  // ==========================================
  // API: PAGOS (Payments)
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