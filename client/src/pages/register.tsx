import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth";
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments, users, notifications, auditLogs } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import express from "express";
import bcrypt from "bcryptjs";
import storage from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const logAction = async (user: any, action: string, entity: string, details: string, entityId?: string) => {
    if (!user) return;
    try {
      await db.insert(auditLogs).values({
        id: randomUUID(), userId: user.id, userName: user.name || "Unknown", action, entity, entityId: entityId || null, details, timestamp: new Date()
      });
    } catch (error) { console.error("Error saving log:", error); }
  };

  const notifyAdmins = async (type: 'info' | 'warning' | 'success', title: string, message: string, link: string) => {
    try {
      const admins = await db.query.users.findMany({ where: eq(users.role, 'admin') });
      for (const admin of admins) {
        await storage.createNotification({ userId: admin.id, type, title, message, link });
      }
    } catch (e) { console.error("Error notif admin:", e); }
  };

  const notifyUser = async (userId: string, type: 'info' | 'warning' | 'success', title: string, message: string, link: string) => {
    try { await storage.createNotification({ userId, type, title, message, link }); } catch (e) { console.error("Error notif user:", e); }
  };

  app.get("/api/public/route-slips/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const slip = await db.query.routeSlips.findFirst({ where: eq(routeSlips.id, id), with: { driver: true, vehicle: true } });
      if (!slip) return res.status(404).send("Documento no encontrado");
      res.json(slip);
    } catch (e) { res.status(500).send("Error"); }
  });

  app.post("/api/register", async (req: any, res, next) => {
    try {
      const { email, password, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body;
      if (!email || !password || !name || !rut) return res.status(400).send("Faltan datos");
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (exist) return res.status(400).send("Email registrado");

      const uid = randomUUID();
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: uid, email, password: hashedPassword, name, role: 'driver', createdAt: new Date() };
      await db.insert(users).values(newUser);

      const did = randomUUID();
      await db.insert(drivers).values({
        id: did, userId: uid, email, name, rut, phone: phone || "", commune: commune || "", address: address || null,
        licenseNumber: licenseNumber || "", licenseClass: licenseClass || "B", licenseDate: licenseDate || new Date().toISOString(), status: 'active', createdAt: new Date()
      });

      await logAction({ id: uid, name }, "REGISTER", "User", `Registro: ${name}`, uid);
      await notifyAdmins("info", "Nuevo Registro", `${name} registrado.`, "/drivers");
      req.login(newUser, (err: any) => { if (err) return next(err); return res.status(201).json({ ...newUser, password: undefined }); });
    } catch (e) { res.status(500).send("Error"); }
  });

  app.get("/api/audit-logs", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.sendStatus(403);
    const logs = await db.query.auditLogs.findMany({ orderBy: (t, { desc }) => [desc(t.timestamp)], limit: 100 });
    res.json(logs);
  });

  app.get("/api/notifications", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const notifs = await storage.getNotifications(req.user.id);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", verifyAuth, async (req, res) => {
    await storage.markNotificationAsRead(req.params.id); res.sendStatus(200);
  });

  app.get("/api/vehicle-locations", verifyAuth, async (req, res) => {
    const activeLocations = await storage.getAllVehicleLocations();
    const enrichedFleet = [];
    for (const loc of activeLocations) {
      const vehicleInfo = await db.query.vehicles.findFirst({ where: eq(vehicles.id, loc.vehicleId) });
      const slip = await db.query.routeSlips.findFirst({ where: eq(routeSlips.vehicleId, loc.vehicleId), orderBy: (t, { desc }) => [desc(t.createdAt)], with: { driver: true } });
      if (vehicleInfo && slip && slip.driver) {
         enrichedFleet.push({ ...loc, model: vehicleInfo.model, driverName: slip.driver.name, isPaid: slip.paymentStatus === 'paid' });
      }
    }
    res.json(enrichedFleet);
  });

  app.post("/api/vehicle-locations", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'driver') return res.status(403).send("Solo conductores");
    const { lat, lng, status, speed } = req.body;
    const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
    if (!driver) return res.status(404).send("No encontrado");
    const slips = await db.query.routeSlips.findMany({ where: eq(routeSlips.driverId, driver.id), orderBy: (t, { desc }) => [desc(t.createdAt)], limit: 1, with: { vehicle: true } });
    if (slips.length === 0 || !slips[0].vehicle) return res.sendStatus(200);
    const activeVehicle = slips[0].vehicle;
    if (status === 'offline') { await storage.removeVehicleLocation(activeVehicle.id); return res.sendStatus(200); }
    await storage.updateVehicleLocation({ vehicleId: activeVehicle.id, plate: activeVehicle.plate, lat: parseFloat(lat), lng: parseFloat(lng), status: 'active', speed: parseFloat(speed || "0"), timestamp: Date.now() } as any);
    res.sendStatus(200);
  });

  // --- HOJAS DE RUTA (LÓGICA SNAPSHOT) ---
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
     if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
     try {
       const newId = randomUUID();
       // 🟢 1. OBTENER DATOS REALES PARA SNAPSHOT
       const driverInfo = await db.query.drivers.findFirst({ where: eq(drivers.id, req.body.driverId) });
       const vehicleInfo = await db.query.vehicles.findFirst({ where: eq(vehicles.id, req.body.vehicleId) });
       
       const driverName = driverInfo?.name || "Conductor";
       const plate = vehicleInfo?.plate || "Sin patente";

       // 🟢 2. GUARDAR SNAPSHOTS
       const data = { 
           ...req.body, 
           id: newId, 
           driverNameSnapshot: driverName, 
           vehiclePlateSnapshot: plate,
           signatureUrl: null, paymentStatus: 'pending', isDuplicate: false, createdAt: new Date() 
       };
       
       await db.insert(routeSlips).values(data);
       await logAction(req.user, "CREATE", "Route Slip", `Hoja para ${driverName}`, newId);
       await notifyAdmins("warning", "Hoja Pendiente", `${driverName} debe pagar hoja ${data.date}`, "/route-slips");
       if (driverInfo && driverInfo.userId) await notifyUser(driverInfo.userId, "warning", "Hoja Pendiente", `Hoja ${data.date} generada`, "/route-slips");

       res.status(201).json(data);
     } catch (e) { res.status(500).send("Error"); }
  });

  app.put("/api/route-slips/:id", verifyAuth, async (req, res) => { 
    const data: any = { ...req.body }; if (data.isDuplicate === undefined) delete data.isDuplicate;
    await db.update(routeSlips).set(data).where(eq(routeSlips.id, req.params.id)); 
    res.json({ message: "Ok" }); 
  });
  
  // 🟢 3. GET: USAR SNAPSHOT SI EL DRIVER ES NULL (BORRADO)
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    let result = [];
    if (req.user?.role === 'admin') {
        result = await db.query.routeSlips.findMany({ with: { driver: true, vehicle: true }, orderBy: (t, { desc }) => [desc(t.createdAt)] });
    } else {
        const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user!.id) });
        if (!driver) return res.json([]);
        result = await db.query.routeSlips.findMany({ where: eq(routeSlips.driverId, driver.id), with: { driver: true, vehicle: true }, orderBy: (t, { desc }) => [desc(t.createdAt)] });
    }
    const processed = result.map(slip => ({
        ...slip,
        driver: slip.driver || { id: "deleted", name: slip.driverNameSnapshot || "(Eliminado)", rut: "---" },
        vehicle: slip.vehicle || { id: "deleted", plate: slip.vehiclePlateSnapshot || "(Eliminado)", model: "---" }
    }));
    return res.json(processed);
  });

  // --- CONDUCTORES ---
  app.get("/api/drivers", verifyAuth, async (req, res) => { 
      const all = await db.query.drivers.findMany({ orderBy: (d, { desc }) => [desc(d.createdAt)] }); 
      res.json(all); 
  });
  
  app.post("/api/drivers", verifyAuth, async (req, res) => { 
    try { 
      const { email, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate, lastControlDate } = req.body; 
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) }); 
      if (exist) return res.status(400).json({ message: "Correo existe" }); 
      
      const uid = randomUUID(); 
      // Contraseña = RUT sin DV
      const cleanRut = rut.replace(/[^0-9kK]/g, ""); 
      const rutBody = cleanRut.slice(0, -1);
      const pass = await bcrypt.hash(rutBody, 10); 
      
      await db.insert(users).values({ id: uid, email, password: pass, name, role: 'driver', createdAt: new Date() }); 
      
      const did = randomUUID(); 
      const dData = { 
          id: did, userId: uid, email, name, rut, phone, commune, address: address || null, 
          licenseNumber, licenseClass, licenseDate, lastControlDate: lastControlDate || null, 
          createdAt: new Date(), status: 'active' 
      }; 
      await db.insert(drivers).values(dData); 
      await logAction(req.user, "CREATE", "Driver", `Creado: ${name}`, did);
      res.status(201).json(dData); 
    } catch (e) { res.status(500).send("Error"); } 
  });

  app.put("/api/drivers/:id", verifyAuth, async (req, res) => { 
    await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id)); 
    res.json({ message: "Ok" }); 
  });

  // 🟢 4. BORRADO FÍSICO CON DESVINCULACIÓN (UNLINK)
  app.delete("/api/drivers/:id", verifyAuth, async (req, res) => { 
    try { 
      const d = await db.query.drivers.findFirst({ where: eq(drivers.id, req.params.id) }); 
      if (!d) return res.status(404).send("No encontrado"); 
      
      // A) Desvincular Hojas de Ruta (El snapshot mantiene el nombre)
      await db.update(routeSlips).set({ driverId: null }).where(eq(routeSlips.driverId, req.params.id));

      // B) Desvincular Pagos
      await db.update(payments).set({ driverId: null }).where(eq(payments.driverId, req.params.id));

      // C) Borrar Usuario Login
      if (d.userId) await db.delete(users).where(eq(users.id, d.userId)); 
      
      // D) BORRAR FÍSICAMENTE EL CONDUCTOR
      await db.delete(drivers).where(eq(drivers.id, req.params.id));
      
      await logAction(req.user, "DELETE", "Driver", `Eliminado totalmente: ${d.name}`, req.params.id);
      res.json({ message: "Eliminado" }); 
    } catch (e) { res.status(500).send("Error eliminando"); } 
  });
  
  // VEHICULOS
  app.get("/api/vehicles", verifyAuth, async (req, res) => { const all = await db.query.vehicles.findMany(); res.json(all); });
  app.post("/api/vehicles", verifyAuth, async (req, res) => { const vid = randomUUID(); await db.insert(vehicles).values({ ...req.body, id: vid, createdAt: new Date(), status: 'active' }); res.status(201).json({id:vid}); });
  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => { await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id)); res.json({ message: "Ok" }); });
  app.delete("/api/vehicles/:id", verifyAuth, async (req, res) => { await db.delete(vehicles).where(eq(vehicles.id, req.params.id)); res.json({ message: "Ok" }); });
  
  // PAGOS
  app.get("/api/payments", verifyAuth, async (req, res) => { 
      if (!req.user) return res.sendStatus(401); 
      const all = req.user.role === 'admin' 
        ? await db.query.payments.findMany({ with: { routeSlip: { with: { driver: true, vehicle: true } } }, orderBy: (p, { desc }) => [desc(p.date)] })
        : await db.query.payments.findMany({ where: eq(payments.driverId, (await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) }))?.id!), with: { routeSlip: { with: { driver: true, vehicle: true } } }, orderBy: (p, { desc }) => [desc(p.date)] });
      res.json(all || []); 
  });

  app.post("/api/payments", verifyAuth, async (req, res) => { 
      const pid = randomUUID(); const proof = req.body.proofOfPayment; 
      const pData = { id: pid, routeSlipId: req.body.routeSlipId, type: req.body.type, amount: parseInt(req.body.amount || "0"), driverId: req.body.driverId, vehicleId: req.body.vehicleId, date: req.body.date, proofOfPayment: proof, status: 'completed', createdAt: new Date() }; 
      await db.insert(payments).values(pData); 
      if (req.body.routeSlipId) await db.update(routeSlips).set({ paymentStatus: 'paid' }).where(eq(routeSlips.id, req.body.routeSlipId)); 
      
      const driverInfo = await db.query.drivers.findFirst({ where: eq(drivers.id, pData.driverId) });
      const driverName = driverInfo?.name || "Conductor";
      await notifyAdmins("success", "Pago Confirmado", `${driverName} pagó $${pData.amount}`, "/payments");
      res.status(201).json(pData); 
  });

  app.put("/api/payments/:id", verifyAuth, async (req, res) => { await db.update(payments).set(req.body).where(eq(payments.id, req.params.id)); res.json({ message: "Ok" }); });
  app.delete("/api/payments/:id", verifyAuth, async (req, res) => { await db.delete(payments).where(eq(payments.id, req.params.id)); res.json({ message: "Ok" }); });

  const httpServer = createServer(app);
  return httpServer;
}