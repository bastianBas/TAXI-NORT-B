import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth";
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments, users, notifications, gpsHistory } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import storage from "./storage";

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

  // --- REGISTRO PÚBLICO (APP MÓVIL) ---
  app.post("/api/register", async (req: any, res, next) => {
    try {
      const { email, password, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body;

      if (!email || !password || !name || !rut) {
        return res.status(400).send("Faltan datos obligatorios");
      }

      const exist = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (exist) return res.status(400).send("El email ya está registrado");

      const uid = randomUUID();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = {
        id: uid,
        email,
        password: hashedPassword,
        name,
        role: 'driver',
        createdAt: new Date()
      };
      
      await db.insert(users).values(newUser);

      const did = randomUUID();
      await db.insert(drivers).values({
        id: did,
        userId: uid,
        email,
        name,
        rut,
        phone: phone || "Por completar",
        commune: commune || "Por completar",
        address: address || null,
        licenseNumber: licenseNumber || "Por completar",
        licenseClass: licenseClass || "B",
        licenseDate: licenseDate || new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date()
      });

      req.login(newUser, (err: any) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json(userWithoutPassword);
      });

    } catch (e) {
      console.error("Error registro:", e);
      if (e instanceof Error && e.message.includes("Duplicate entry")) {
         return res.status(400).send("Error: El RUT o Email ya existe.");
      }
      res.status(500).send("Error interno.");
    }
  });

  // =================================================================
  // ZONA PROTEGIDA
  // =================================================================

  app.get("/api/notifications", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const notifs = await storage.getNotifications(req.user.id);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", verifyAuth, async (req, res) => {
    await storage.markNotificationAsRead(req.params.id);
    res.sendStatus(200);
  });

  // --- GPS ---
  app.get("/api/vehicle-locations", verifyAuth, async (req, res) => {
    try {
      const activeLocations = await storage.getAllVehicleLocations();
      const enrichedFleet = [];
      
      for (const loc of activeLocations) {
        const vehicleInfo = await db.query.vehicles.findFirst({ where: eq(vehicles.id, loc.vehicleId) });
        const slip = await db.query.routeSlips.findFirst({
           where: eq(routeSlips.vehicleId, loc.vehicleId),
           orderBy: (t, { desc }) => [desc(t.createdAt)],
           with: { driver: true }
        });

        if (vehicleInfo && slip && slip.driver) {
           enrichedFleet.push({
             ...loc,
             model: vehicleInfo.model,
             driverName: slip.driver.name,
             isPaid: slip.paymentStatus === 'paid'
           });
        }
      }
      res.json(enrichedFleet);
    } catch (error) {
      console.error("Error obteniendo flota:", error);
      res.status(500).json([]);
    }
  });

  app.post("/api/vehicle-locations", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'driver') return res.status(403).send("Solo conductores");

    try {
      const { lat, lng, status, speed } = req.body;
      const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
      if (!driver) return res.status(404).send("Perfil de conductor no encontrado");

      const slips = await db.query.routeSlips.findMany({
        where: eq(routeSlips.driverId, driver.id),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 1,
        with: { vehicle: true }
      });

      if (slips.length === 0 || !slips[0].vehicle) return res.sendStatus(200); 
      
      const activeVehicle = slips[0].vehicle;

      if (status === 'offline') {
        await storage.removeVehicleLocation(activeVehicle.id);
        return res.sendStatus(200);
      }

      await storage.updateVehicleLocation({
        vehicleId: activeVehicle.id,
        plate: activeVehicle.plate,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: 'active',
        speed: parseFloat(speed || "0"),
        timestamp: Date.now()
      } as any);

      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      res.status(500).send("Error guardando ubicación");
    }
  });

  // --- HOJAS DE RUTA ---
  app.post("/api/route-slips", verifyAuth, upload.any(), async (req, res) => {
     if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
     try {
       const newId = randomUUID();
       let url = null;
       if (req.files && Array.isArray(req.files) && req.files.length > 0) url = `uploads/${req.files[0].filename}`;

       const data = { ...req.body, id: newId, signatureUrl: url, paymentStatus: 'pending', isDuplicate: false, createdAt: new Date() };
       
       await db.insert(routeSlips).values(data);

       try {
         const driverProfile = await storage.getDriver(data.driverId);
         if (driverProfile && driverProfile.userId) {
            await storage.createNotification({ userId: driverProfile.userId, type: 'payment_due', title: 'Hoja de Ruta Creada', message: `Nueva hoja de ruta del ${data.date}.`, link: '/payments' });
         }
       } catch (notifError) { console.error(notifError); }

       res.status(201).json(data);
     } catch (e) { console.error(e); res.status(500).send("Error al guardar en DB."); }
  });

  app.put("/api/route-slips/:id", verifyAuth, upload.any(), async (req, res) => { try { const data: any = { ...req.body }; if (req.files && Array.isArray(req.files) && req.files.length > 0) data.signatureUrl = `uploads/${req.files[0].filename}`; await db.update(routeSlips).set(data).where(eq(routeSlips.id, req.params.id)); res.json({ message: "Updated" }); } catch (e) { res.status(500).send("Error"); } });
  
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    try {
        const all = await db.query.routeSlips.findMany({ with: { driver: true, vehicle: true }, orderBy: (t, { desc }) => [desc(t.createdAt)] });
        res.json(all);
    } catch (e) { console.error(e); res.status(500).json([]); }
  });

  // --- CONDUCTORES (RESTAURADO) ---
  app.get("/api/drivers", verifyAuth, async (req, res) => { const all = await db.query.drivers.findMany({ orderBy: (d, { desc }) => [desc(d.createdAt)] }); res.json(all); });
  
  // 🟢 LÓGICA DE CREACIÓN DE CONDUCTOR RESTAURADA
  app.post("/api/drivers", verifyAuth, async (req, res) => { 
    try { 
      const { email, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body; 
      
      // 1. Validar si existe el usuario
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) }); 
      if (exist) return res.status(400).json({ message: "El email ya está registrado" }); 
      
      // 2. Crear usuario base (password 123456 por defecto para conductores creados por admin)
      const uid = randomUUID(); 
      const pass = await bcrypt.hash("123456", 10); 
      await db.insert(users).values({ id: uid, email, password: pass, name, role: 'driver', createdAt: new Date() }); 
      
      // 3. Crear perfil de conductor
      const did = randomUUID(); 
      const dData = { id: did, userId: uid, email, name, rut, phone, commune, address: address || null, licenseNumber, licenseClass, licenseDate, createdAt: new Date(), status: 'active' }; 
      await db.insert(drivers).values(dData); 
      
      res.status(201).json(dData); 
    } catch (e) { 
      console.error(e); 
      res.status(500).send("Error al crear conductor"); 
    } 
  });

  app.put("/api/drivers/:id", verifyAuth, async (req, res) => { try { await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id)); res.json({ message: "Updated" }); } catch (e) { res.status(500).send("Error"); } });
  app.delete("/api/drivers/:id", verifyAuth, async (req, res) => { try { const d = await db.query.drivers.findFirst({ where: eq(drivers.id, req.params.id) }); if (!d) return res.status(404).send("Not found"); await db.delete(drivers).where(eq(drivers.id, req.params.id)); if (d.userId) await db.delete(users).where(eq(users.id, d.userId)); res.json({ message: "Deleted" }); } catch (e) { res.status(500).send("Error"); } });
  
  // --- VEHÍCULOS (RESTAURADO) ---
  app.get("/api/vehicles", verifyAuth, async (req, res) => { const all = await db.query.vehicles.findMany(); res.json(all); });
  
  // 🟢 LÓGICA DE CREACIÓN DE VEHÍCULO RESTAURADA
  app.post("/api/vehicles", verifyAuth, async (req, res) => { 
    try { 
      const vid = randomUUID(); 
      const vData = { ...req.body, id: vid, createdAt: new Date(), status: 'active' }; 
      await db.insert(vehicles).values(vData); 
      res.status(201).json(vData); 
    } catch (e) { 
      console.error(e);
      res.status(500).send("Error al crear vehículo"); 
    } 
  });

  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => { try { await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id)); res.json({ message: "Updated" }); } catch (e) { res.status(500).send("Error"); } });
  app.delete("/api/vehicles/:id", verifyAuth, async (req, res) => { try { await db.delete(vehicles).where(eq(vehicles.id, req.params.id)); res.json({ message: "Deleted" }); } catch (e) { res.status(500).send("Error"); } });
  
  // --- PAGOS (CON ARREGLO DE TABLA Y EDICIÓN) ---
  app.get("/api/payments", verifyAuth, async (req, res) => { 
      if (!req.user) return res.sendStatus(401); 
      try { 
          // Incluimos driver y vehicle anidados dentro de routeSlip
          const all = await db.query.payments.findMany({ 
            with: { 
              routeSlip: {
                with: { driver: true, vehicle: true }
              } 
            }, 
            orderBy: (p, { desc }) => [desc(p.date)] 
          }); 
          res.json(all); 
      } catch (e) { res.status(500).json([]); } 
  });

  app.post("/api/payments", verifyAuth, upload.any(), async (req, res) => { 
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

  app.put("/api/payments/:id", verifyAuth, upload.any(), async (req, res) => {
    try {
        const pId = req.params.id;
        const data: any = { ...req.body };
        // Si hay archivo nuevo, actualizar
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            data.proofOfPayment = `uploads/${req.files[0].filename}`;
        }
        if (data.amount) data.amount = parseInt(data.amount);

        await db.update(payments).set(data).where(eq(payments.id, pId));
        res.json({ message: "Pago actualizado" });
    } catch (e) {
        console.error("Error actualizando pago:", e);
        res.status(500).json({ message: "Error al actualizar pago" }); 
    }
  });

  app.delete("/api/payments/:id", verifyAuth, async (req, res) => { try { await db.delete(payments).where(eq(payments.id, req.params.id)); res.json({ message: "Deleted" }); } catch (e) { res.status(500).send("Error"); } });

  const httpServer = createServer(app);
  return httpServer;
}