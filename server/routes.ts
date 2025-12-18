import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth";
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments, users, notifications, auditLogs, gpsHistory } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer"; // Lo mantenemos por si alguna función antigua lo usa
import path from "path";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import storage from "./storage";

// Configuración de Multer (La dejamos por compatibilidad con código antiguo, aunque Pagos usará Base64)
const storageMulter = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storageMulter });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // 🟢 1. CONFIGURACIÓN CRÍTICA: Aumentar límite para recibir imágenes en Base64 (Texto)
  // Esto permite que el servidor reciba la imagen "codificada" sin guardarla en disco
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 🟢 2. HELPER: Registro de Auditoría
  const logAction = async (user: any, action: string, entity: string, details: string, entityId?: string) => {
    if (!user) return;
    try {
      await db.insert(auditLogs).values({
        id: randomUUID(),
        userId: user.id,
        userName: user.name || "Unknown",
        action: action,
        entity: entity,
        entityId: entityId || null,
        details: details,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error saving audit log:", error);
    }
  };

  // =================================================================
  // ZONA PÚBLICA (Registro)
  // =================================================================
  app.post("/api/register", async (req: any, res, next) => {
    try {
      const { email, password, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body;

      if (!email || !password || !name || !rut) return res.status(400).send("Faltan campos obligatorios");

      const exist = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (exist) return res.status(400).send("El correo ya está registrado");

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

      await logAction({ id: uid, name: name }, "REGISTER", "User", `Nuevo conductor registrado: ${name}`, uid);

      req.login(newUser, (err: any) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json(userWithoutPassword);
      });

    } catch (e) {
      console.error("Error en registro:", e);
      res.status(500).send("Error interno del servidor.");
    }
  });

  // =================================================================
  // ZONA PROTEGIDA (Requiere Login)
  // =================================================================

  // --- AUDIT LOGS ---
  app.get("/api/audit-logs", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.sendStatus(403);
    try {
      const logs = await db.query.auditLogs.findMany({
        orderBy: (t, { desc }) => [desc(t.timestamp)],
        limit: 100
      });
      res.json(logs);
    } catch (e) {
      console.error(e);
      res.status(500).json([]);
    }
  });

  // --- NOTIFICACIONES ---
  app.get("/api/notifications", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
        const notifs = await storage.getNotifications(req.user.id);
        res.json(notifs);
    } catch (e) {
        console.error(e);
        res.status(500).json([]);
    }
  });

  app.patch("/api/notifications/:id/read", verifyAuth, async (req, res) => {
    try {
        await storage.markNotificationAsRead(req.params.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send("Error");
    }
  });

  // --- GPS Y UBICACIONES ---
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
      console.error("Error fetching fleet:", error);
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

  // --- HOJAS DE RUTA (ROUTE SLIPS) ---
  // Mantenemos la lógica completa
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
     if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
     try {
       const newId = randomUUID();
       // Si el frontend envía signatureUrl (base64 o ruta), lo usamos directo
       const data = { 
           ...req.body, 
           id: newId, 
           paymentStatus: 'pending', 
           isDuplicate: false, 
           createdAt: new Date() 
       };
       
       await db.insert(routeSlips).values(data);
       await logAction(req.user, "CREATE", "Route Slip", `Creada para fecha ${data.date}`, newId);

       try {
         const driverProfile = await storage.getDriver(data.driverId);
         if (driverProfile && driverProfile.userId) {
            await storage.createNotification({ 
                userId: driverProfile.userId, 
                type: 'payment_due', 
                title: 'Nueva Hoja de Ruta', 
                message: `Se ha asignado una hoja para el ${data.date}.`, 
                link: '/payments' 
            });
         }
       } catch (notifError) { console.error(notifError); }

       res.status(201).json(data);
     } catch (e) { 
         console.error(e); 
         res.status(500).send("Error guardando en BD."); 
     }
  });

  app.put("/api/route-slips/:id", verifyAuth, async (req, res) => { 
    try { 
      const data: any = { ...req.body }; 
      // Limpieza de campos undefined
      if (data.isDuplicate === undefined) delete data.isDuplicate;

      await db.update(routeSlips).set(data).where(eq(routeSlips.id, req.params.id)); 
      
      await logAction(req.user, "MODIFY", "Route Slip", `Modificada ID: ...${req.params.id.slice(-6)}`, req.params.id);
      
      res.json({ message: "Actualizado correctamente" }); 
    } catch (e) { 
        res.status(500).send("Error al actualizar"); 
    } 
  });
  
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    try {
        if (req.user?.role === 'admin') {
            const all = await db.query.routeSlips.findMany({ 
                with: { driver: true, vehicle: true }, 
                orderBy: (t, { desc }) => [desc(t.createdAt)] 
            });
            return res.json(all);
        } else {
            const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user!.id) });
            if (!driver) return res.json([]);
            
            const mySlips = await db.query.routeSlips.findMany({ 
                where: eq(routeSlips.driverId, driver.id), 
                with: { driver: true, vehicle: true }, 
                orderBy: (t, { desc }) => [desc(t.createdAt)] 
            });
            return res.json(mySlips);
        }
    } catch (e) { console.error(e); res.status(500).json([]); }
  });

  // --- CONDUCTORES (CRUD Completo Restaurado) ---
  app.get("/api/drivers", verifyAuth, async (req, res) => { 
      const all = await db.query.drivers.findMany({ orderBy: (d, { desc }) => [desc(d.createdAt)] }); 
      res.json(all); 
  });
  
  app.post("/api/drivers", verifyAuth, async (req, res) => { 
    try { 
      const { email, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body; 
      
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) }); 
      if (exist) return res.status(400).json({ message: "El correo ya existe" }); 
      
      const uid = randomUUID(); 
      const pass = await bcrypt.hash("123456", 10); // Contraseña por defecto
      
      await db.insert(users).values({ id: uid, email, password: pass, name, role: 'driver', createdAt: new Date() }); 
      
      const did = randomUUID(); 
      const dData = { 
          id: did, 
          userId: uid, 
          email, 
          name, 
          rut, 
          phone, 
          commune, 
          address: address || null, 
          licenseNumber, 
          licenseClass, 
          licenseDate, 
          createdAt: new Date(), 
          status: 'active' 
      }; 
      await db.insert(drivers).values(dData); 
      
      await logAction(req.user, "CREATE", "Driver", `Creado conductor: ${name}`, did);

      res.status(201).json(dData); 
    } catch (e) { console.error(e); res.status(500).send("Error creando conductor"); } 
  });

  app.put("/api/drivers/:id", verifyAuth, async (req, res) => { 
    try { 
      await db.update(drivers).set(req.body).where(eq(drivers.id, req.params.id)); 
      await logAction(req.user, "MODIFY", "Driver", `Actualizado conductor`, req.params.id);
      res.json({ message: "Actualizado" }); 
    } catch (e) { res.status(500).send("Error actualizando conductor"); } 
  });

  app.delete("/api/drivers/:id", verifyAuth, async (req, res) => { 
    try { 
      const d = await db.query.drivers.findFirst({ where: eq(drivers.id, req.params.id) }); 
      if (!d) return res.status(404).send("No encontrado"); 
      
      await db.delete(drivers).where(eq(drivers.id, req.params.id)); 
      if (d.userId) await db.delete(users).where(eq(users.id, d.userId)); 
      
      await logAction(req.user, "DELETE", "Driver", `Eliminado conductor: ${d.name}`, req.params.id);
      
      res.json({ message: "Eliminado" }); 
    } catch (e) { res.status(500).send("Error eliminando"); } 
  });
  
  // --- VEHÍCULOS (CRUD Completo Restaurado) ---
  app.get("/api/vehicles", verifyAuth, async (req, res) => { 
      const all = await db.query.vehicles.findMany(); 
      res.json(all); 
  });

  app.post("/api/vehicles", verifyAuth, async (req, res) => { 
    try { 
      const vid = randomUUID(); 
      const vData = { ...req.body, id: vid, createdAt: new Date(), status: 'active' }; 
      await db.insert(vehicles).values(vData); 
      
      await logAction(req.user, "CREATE", "Vehicle", `Creado vehículo: ${req.body.plate}`, vid);
      res.status(201).json(vData); 
    } catch (e) { res.status(500).send("Error creando vehículo"); } 
  });

  app.put("/api/vehicles/:id", verifyAuth, async (req, res) => { 
    try { 
      await db.update(vehicles).set(req.body).where(eq(vehicles.id, req.params.id)); 
      await logAction(req.user, "MODIFY", "Vehicle", `Actualizado vehículo ID: ...${req.params.id.slice(-6)}`, req.params.id);
      res.json({ message: "Actualizado" }); 
    } catch (e) { res.status(500).send("Error actualizando"); } 
  });

  app.delete("/api/vehicles/:id", verifyAuth, async (req, res) => { 
    try { 
      await db.delete(vehicles).where(eq(vehicles.id, req.params.id)); 
      await logAction(req.user, "DELETE", "Vehicle", `Vehículo eliminado`, req.params.id);
      res.json({ message: "Eliminado" }); 
    } catch (e) { res.status(500).send("Error eliminando"); } 
  });
  
  // =================================================================
  // PAGOS (SOLUCIÓN BASE64 PARA IMÁGENES QUE NO DESAPARECEN)
  // =================================================================
  app.get("/api/payments", verifyAuth, async (req, res) => { 
      if (!req.user) return res.sendStatus(401); 
      try { 
          if (req.user.role === 'admin') {
              const all = await db.query.payments.findMany({ 
                  with: { routeSlip: { with: { driver: true, vehicle: true } } }, 
                  orderBy: (p, { desc }) => [desc(p.date)] 
              }); 
              return res.json(all); 
          } else {
              const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, req.user.id) });
              if (!driver) return res.json([]);
              
              const myPayments = await db.query.payments.findMany({ 
                  where: eq(payments.driverId, driver.id), 
                  with: { routeSlip: { with: { driver: true, vehicle: true } } }, 
                  orderBy: (p, { desc }) => [desc(p.date)] 
              }); 
              return res.json(myPayments);
          }
      } catch (e) { res.status(500).json([]); } 
  });

  app.post("/api/payments", verifyAuth, async (req, res) => { 
      try { 
          const pid = randomUUID(); 
          
          // 🟢 RECIBIMOS LA IMAGEN COMO TEXTO BASE64
          // Esto evita usar carpetas que se borran
          const proof = req.body.proofOfPayment; 
          
          const pData = { 
              id: pid, 
              routeSlipId: req.body.routeSlipId, 
              type: req.body.type, 
              amount: parseInt(req.body.amount || "0"), 
              driverId: req.body.driverId, 
              vehicleId: req.body.vehicleId, 
              date: req.body.date, 
              proofOfPayment: proof, // Se guarda directo en BD
              status: 'completed', 
              createdAt: new Date() 
          }; 
          
          await db.insert(payments).values(pData); 
          
          if (req.body.routeSlipId) { 
              await db.update(routeSlips).set({ paymentStatus: 'paid' }).where(eq(routeSlips.id, req.body.routeSlipId)); 
          }
          
          await logAction(req.user, "CREATE", "Payment", `Pago registrado: $${pData.amount}`, pid);

          res.status(201).json(pData); 
      } catch (e) { 
          console.error(e); 
          res.status(500).send("Error guardando el pago"); 
      } 
  });

  app.put("/api/payments/:id", verifyAuth, async (req, res) => {
    try {
        const pId = req.params.id;
        const data: any = { ...req.body };
        
        if (data.amount) data.amount = parseInt(data.amount);

        // Si viene una nueva imagen en Base64, reemplazará la anterior automáticamente
        await db.update(payments).set(data).where(eq(payments.id, pId));
        
        await logAction(req.user, "MODIFY", "Payment", `Pago actualizado ID: ...${pId.slice(-6)}`, pId);

        res.json({ message: "Pago actualizado" });
    } catch (e) {
        console.error("Error actualizando pago:", e);
        res.status(500).json({ message: "Error al actualizar" }); 
    }
  });

  app.delete("/api/payments/:id", verifyAuth, async (req, res) => { 
    try { 
      await db.delete(payments).where(eq(payments.id, req.params.id)); 
      await logAction(req.user, "DELETE", "Payment", `Pago eliminado`, req.params.id);
      res.json({ message: "Eliminado" }); 
    } catch (e) { res.status(500).send("Error eliminando"); } 
  });

  const httpServer = createServer(app);
  return httpServer;
}