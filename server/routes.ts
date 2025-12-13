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
import { storage } from "./storage"; // Importante: usamos storage para acceder a Firebase

const storageMulter = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storageMulter });

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // --- ZONA DE GEOLOCALIZACIÓN (CONECTADA A FIREBASE) ---

  // 1. GET: El Dashboard pide todas las ubicaciones
  // El servidor las busca en Firebase y las devuelve
  app.get("/api/vehicle-locations", verifyAuth, async (req, res) => {
    try {
      const locations = await storage.getAllVehicleLocations();
      res.json(locations);
    } catch (error) {
      console.error(error);
      res.status(500).json([]);
    }
  });

  // 2. POST: El Conductor envía su ubicación GPS
  // El servidor valida en MySQL quién es y luego guarda en Firebase
  app.post("/api/vehicle-locations", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'driver') return res.status(403).send("Solo conductores");

    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return res.status(400).send("Faltan coordenadas");

      // A. Validar conductor en MySQL
      const driver = await storage.getDriverByUserId(req.user.id);
      if (!driver) return res.status(404).send("Perfil de conductor no encontrado");

      // B. Buscar qué auto conduce hoy (Hoja de Ruta activa en MySQL)
      const slips = await db.query.routeSlips.findMany({
          where: eq(routeSlips.driverId, driver.id),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 1,
          with: { vehicle: true }
      });

      if (slips.length === 0 || !slips[0].vehicle) {
         return res.status(400).send("No tienes vehículo asignado (Crea una Hoja de Ruta)");
      }

      const activeVehicle = slips[0].vehicle;

      // C. Guardar en Firebase
      await storage.updateVehicleLocation({
        vehicleId: activeVehicle.id,
        plate: activeVehicle.plate,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: 'active',
        timestamp: Date.now()
      });

      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      res.status(500).send("Error guardando ubicación");
    }
  });

  // --- RESTO DE RUTAS (Sin cambios) ---

  // RESET ADMIN
  app.get("/api/emergency-reset-admin", async (req, res) => {
    try {
      const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, "admin@taxinort.cl") });
      if (existingAdmin) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await db.update(users).set({ password: hashedPassword, role: 'admin' }).where(eq(users.email, "admin@taxinort.cl"));
        return res.json({ message: "Admin reset: admin123" });
      }
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({ id: randomUUID(), email: "admin@taxinort.cl", password: hashedPassword, name: "Admin", role: "admin", createdAt: new Date() });
      res.json({ message: "Admin created: admin123" });
    } catch (error) { res.status(500).send("Error: " + error); }
  });

  // HOJAS DE RUTA
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    if (!req.user) return res.status(401).send("No autorizado");
    try {
      if (req.user.role === 'admin') {
        const all = await db.query.routeSlips.findMany({ with: { driver: true, vehicle: true }, orderBy: (t, { desc }) => [desc(t.date)] });
        return res.json(all);
      }
      if (req.user.role === 'driver') {
        const profile = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
        if (!profile) return res.json([]);
        const mySlips = await db.query.routeSlips.findMany({ where: eq(routeSlips.driverId, profile.id), with: { driver: true, vehicle: true }, orderBy: (t, { desc }) => [desc(t.date)] });
        return res.json(mySlips);
      }
      return res.json([]);
    } catch (e) { res.status(500).json([]); }
  });

  app.post("/api/route-slips", verifyAuth, upload.any(), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const newId = randomUUID();
      let url = null;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) url = `uploads/${req.files[0].filename}`;
      const data = { ...req.body, id: newId, signatureUrl: url, paymentStatus: 'pending', isDuplicate: false, createdAt: new Date() };
      await db.insert(routeSlips).values(data);
      res.status(201).json(data);
    } catch (e) { res.status(500).send("Error"); }
  });

  app.put("/api/route-slips/:id", verifyAuth, upload.any(), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const data: any = { ...req.body };
      if (req.files && Array.isArray(req.files) && req.files.length > 0) data.signatureUrl = `uploads/${req.files[0].filename}`;
      await db.update(routeSlips).set(data).where(eq(routeSlips.id, req.params.id));
      res.json({ message: "Updated" });
    } catch (e) { res.status(500).send("Error"); }
  });

  // CONDUCTORES
  app.get("/api/drivers", verifyAuth, async (req, res) => {
    const all = await db.query.drivers.findMany({ orderBy: (d, { desc }) => [desc(d.createdAt)] });
    res.json(all);
  });

  app.post("/api/drivers", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const { email, name, rut, ...rest } = req.body;
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (exist) return res.status(400).json({ message: "Email existe" });

      const uid = randomUUID();
      const pass = await bcrypt.hash("123456", 10);
      await db.insert(users).values({ id: uid, email, password: pass, name, role: 'driver', createdAt: new Date() });

      const did = randomUUID();
      const dData = { id: did, userId: uid, email, name, rut, ...rest, createdAt: new Date(), status: 'active' };
      await db.insert(drivers).values(dData);
      res.status(201).json(dData);
    } catch (e) { console.error(e); res.status(500).send("Error"); }
  });

  app.put("/api/drivers/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try { await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id)); res.json({ message: "Updated" }); } catch (e) { res.status(500).send("Error"); }
  });

  app.delete("/api/drivers/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const d = await db.query.drivers.findFirst({ where: eq(drivers.id, req.params.id) });
      if (!d) return res.status(404).send("Not found");
      await db.delete(drivers).where(eq(drivers.id, req.params.id));
      if (d.userId) await db.delete(users).where(eq(users.id, d.userId));
      res.json({ message: "Deleted" });
    } catch (e) { res.status(500).send("Error"); }
  });

  // VEHICULOS
  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    const all = await db.query.vehicles.findMany();
    res.json(all);
  });
  app.post("/api/vehicles", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try {
      const vid = randomUUID();
      const vData = { ...req.body, id: vid, createdAt: new Date(), status: 'active' };
      await db.insert(vehicles).values(vData);
      res.status(201).json(vData);
    } catch (e) { res.status(500).send("Error"); }
  });
  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try { await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id)); res.json({ message: "Updated" }); } catch (e) { res.status(500).send("Error"); }
  });
  app.delete("/api/vehicles/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try { await db.delete(vehicles).where(eq(vehicles.id, req.params.id)); res.json({ message: "Deleted" }); } catch (e) { res.status(500).send("Error"); }
  });

  // PAGOS
  app.get("/api/payments", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      if (req.user.role === 'admin') {
        const all = await db.query.payments.findMany({ with: { routeSlip: true }, orderBy: (p, { desc }) => [desc(p.date)] });
        return res.json(all);
      }
      if (req.user.role === 'driver') {
        const profile = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
        if (!profile) return res.json([]);
        const slips = await db.query.routeSlips.findMany({ where: eq(routeSlips.driverId, profile.id) });
        const ids = slips.map(s => s.id);
        if (ids.length === 0) return res.json([]);
        const all = await db.query.payments.findMany({ with: { routeSlip: true }, orderBy: (p, { desc }) => [desc(p.date)] });
        return res.json(all.filter(p => p.routeSlipId && ids.includes(p.routeSlipId)));
      }
      return res.json([]);
    } catch (e) { res.status(500).json([]); }
  });

  // CREAR PAGO
  app.post("/api/payments", verifyAuth, upload.any(), async (req, res) => {
    if (!['admin', 'driver', 'finance'].includes(req.user?.role || '')) return res.status(403).send("No autorizado");
    try {
      const pid = randomUUID();
      let proof = null;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) proof = `uploads/${req.files[0].filename}`;
      const pData = {
        id: pid,
        routeSlipId: req.body.routeSlipId,
        type: req.body.type,
        amount: parseInt(req.body.amount || "0"),
        driverId: req.body.driverId,
        vehicleId: req.body.vehicleId,
        date: req.body.date,
        proofOfPayment: proof,
        status: 'completed',
        createdAt: new Date()
      };
      await db.insert(payments).values(pData);
      if (req.body.routeSlipId) {
        await db.update(routeSlips).set({ paymentStatus: 'paid' }).where(eq(routeSlips.id, req.body.routeSlipId));
      }
      res.status(201).json(pData);
    } catch (e) { console.error(e); res.status(500).send("Error"); }
  });

  app.delete("/api/payments/:id", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
    try { await db.delete(payments).where(eq(payments.id, req.params.id)); res.json({ message: "Deleted" }); } catch (e) { res.status(500).send("Error"); }
  });

  const httpServer = createServer(app);
  return httpServer;
}