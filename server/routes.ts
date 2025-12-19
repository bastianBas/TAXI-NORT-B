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

  // 🟢 CONFIGURACIÓN GLOBAL
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 🟢 HELPER: Logs de Auditoría
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
  // =====================================================
  // 🚨 EMERGENCY RESET ADMIN (USAR SOLO PARA RECUPERACIÓN)
  // =====================================================
  app.post("/api/emergency-reset-admin", async (req, res) => {
    try {
      if (process.env.EMERGENCY_RESET_KEY !== "ENABLE") {
        return res.status(403).send("Emergency reset disabled");
      }

      const email = "admin@taxinort.cl";
      const plainPassword = "admin123";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existing) {
        await db.update(users)
          .set({
            password: hashedPassword,
            role: "admin",
            name: "Administrador",
          })
          .where(eq(users.id, existing.id));

        return res.json({
          message: "Administrador reseteado correctamente",
          email,
          password: plainPassword,
        });
      }

      const adminId = randomUUID();

      await db.insert(users).values({
        id: adminId,
        email,
        password: hashedPassword,
        name: "Administrador",
        role: "admin",
        createdAt: new Date(),
      });

      return res.status(201).json({
        message: "Administrador creado correctamente",
        email,
        password: plainPassword,
      });

    } catch (error) {
      console.error("Emergency admin reset error:", error);
      return res.status(500).send("Error creando administrador");
    }
  });

  // 🟢 HELPER 1: Notificar a TODOS los Administradores
  const notifyAdmins = async (type: 'info' | 'warning' | 'success', title: string, message: string, link: string) => {
    try {
      const admins = await db.query.users.findMany({
        where: eq(users.role, 'admin')
      });
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: type,
          title,
          message,
          link
        });
      }
    } catch (e) {
      console.error("Error notificando admins:", e);
    }
  };

  // 🟢 HELPER 2: Notificar a un Usuario Específico
  const notifyUser = async (userId: string, type: 'info' | 'warning' | 'success', title: string, message: string, link: string) => {
    try {
        await storage.createNotification({
            userId: userId,
            type: type,
            title,
            message,
            link
        });
    } catch (e) {
        console.error("Error notificando usuario:", e);
    }
  };

  // =================================================================
  // ZONA PÚBLICA (Accesible SIN Login)
  // =================================================================

  app.get("/api/public/route-slips/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const slip = await db.query.routeSlips.findFirst({
        where: eq(routeSlips.id, id),
        with: { driver: true, vehicle: true }
      });
      if (!slip) return res.status(404).send("Documento no encontrado");
      res.json(slip);
    } catch (e) {
      console.error("Error fetching public slip:", e);
      res.status(500).send("Error del servidor");
    }
  });

  // Registro Público (Aquí el usuario elige su propia password)
  app.post("/api/register", async (req: any, res, next) => {
    try {
      const { email, password, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body;

      if (!email || !password || !name || !rut) {
        return res.status(400).send("Faltan campos obligatorios");
      }

      const exist = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (exist) {
        return res.status(400).send("El correo electrónico ya está registrado");
      }

      const uid = randomUUID();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = {
        id: uid, email, password: hashedPassword, name, role: 'driver', createdAt: new Date()
      };
      await db.insert(users).values(newUser);

      const did = randomUUID();
      await db.insert(drivers).values({
        id: did, userId: uid, email, name, rut,
        phone: phone || "Por completar", commune: commune || "Por completar", address: address || null,
        licenseNumber: licenseNumber || "Por completar", licenseClass: licenseClass || "B",
        licenseDate: licenseDate || new Date().toISOString().split('T')[0],
        status: 'active', createdAt: new Date()
      });

      await logAction({ id: uid, name: name }, "REGISTER", "User", `Nuevo conductor registrado: ${name}`, uid);

      await notifyAdmins("info", "Nuevo Registro", `${name} (${rut}) se ha registrado en la plataforma.`, "/drivers");

      req.login(newUser, (err: any) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json(userWithoutPassword);
      });

    } catch (e) {
      console.error("Error en registro público:", e);
      res.status(500).send("Error interno");
    }
  });

  // =================================================================
  // ZONA PROTEGIDA (Requiere Inicio de Sesión)
  // =================================================================

  app.get("/api/audit-logs", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') return res.sendStatus(403);
    try {
      const logs = await db.query.auditLogs.findMany({
        orderBy: (t, { desc }) => [desc(t.timestamp)],
        limit: 100
      });
      res.json(logs);
    } catch (e) { res.status(500).json([]); }
  });

  app.get("/api/notifications", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
        const notifs = await storage.getNotifications(req.user.id);
        res.json(notifs);
    } catch (e) { res.status(500).json([]); }
  });

  app.patch("/api/notifications/:id/read", verifyAuth, async (req, res) => {
    try {
        await storage.markNotificationAsRead(req.params.id);
        res.sendStatus(200);
    } catch (e) { res.status(500).send("Error"); }
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
    } catch (error) { res.status(500).json([]); }
  });

  app.post("/api/vehicle-locations", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'driver') return res.status(403).send("Solo conductores pueden enviar GPS");

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
    } catch (e) { res.status(500).send("Error GPS"); }
  });

  // --- HOJAS DE RUTA ---
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
     if (req.user?.role !== 'admin') return res.status(403).send("No autorizado");
     
     try {
       const newId = randomUUID();
       const data = { 
           ...req.body, 
           id: newId, 
           signatureUrl: req.body.signatureUrl || null,
           paymentStatus: 'pending', 
           isDuplicate: false, 
           createdAt: new Date() 
       };
       
       await db.insert(routeSlips).values(data);
       
       const driverInfo = await db.query.drivers.findFirst({ where: eq(drivers.id, data.driverId) });
       const vehicleInfo = await db.query.vehicles.findFirst({ where: eq(vehicles.id, data.vehicleId) });
       const driverName = driverInfo?.name || "Un conductor";
       const plate = vehicleInfo?.plate || "Sin patente";

       await logAction(req.user, "CREATE", "Route Slip", `Creada hoja para ${driverName} (${plate}) - ${data.date}`, newId);

       // 🔔 CASO 1: AVISO AL ADMIN (NARANJA)
       await notifyAdmins(
         "warning", 
         "⚠️ Hoja Pendiente de Pago",
         `El conductor ${driverName} (Patente: ${plate}) tiene pendiente el pago de su hoja del ${data.date}.`,
         "/route-slips"
       );

       // 🔔 CASO 2: AVISO AL CONDUCTOR (NARANJA)
       if (driverInfo && driverInfo.userId) {
          await notifyUser(
              driverInfo.userId,
              "warning",
              "⚠️ Atención: Hoja Pendiente",
              `Se te ha asignado la hoja del ${data.date}. Estado: PENDIENTE DE PAGO.`,
              "/route-slips"
          );
       }

       res.status(201).json(data);
     } catch (e) { res.status(500).send("Error guardando en BD."); }
  });

  app.put("/api/route-slips/:id", verifyAuth, async (req, res) => { 
    try { 
      const data: any = { ...req.body }; 
      if (data.isDuplicate === undefined) delete data.isDuplicate;
      await db.update(routeSlips).set(data).where(eq(routeSlips.id, req.params.id)); 
      await logAction(req.user, "MODIFY", "Route Slip", `Modificada ID: ...${req.params.id.slice(-6)}`, req.params.id);
      res.json({ message: "Actualizado correctamente" }); 
    } catch (e) { res.status(500).send("Error al actualizar"); } 
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
    } catch (e) { res.status(500).json([]); }
  });

  // --- CONDUCTORES (CRUD ADMIN) ---
  app.get("/api/drivers", verifyAuth, async (req, res) => { 
      try {
        const all = await db.query.drivers.findMany({ orderBy: (d, { desc }) => [desc(d.createdAt)] }); 
        res.json(all); 
      } catch (e) { res.status(500).send("Error obteniendo conductores"); }
  });
  
  app.post("/api/drivers", verifyAuth, async (req, res) => { 
    try { 
      const { email, name, rut, phone, commune, address, licenseNumber, licenseClass, licenseDate } = req.body; 
      
      const exist = await db.query.users.findFirst({ where: eq(users.email, email) }); 
      if (exist) return res.status(400).json({ message: "El correo ya existe" }); 
      
      const uid = randomUUID(); 
      
      // 🟢 1. LÓGICA DE CONTRASEÑA = RUT SIN DV
      // Limpiamos todo lo que no sea número o K (por seguridad), luego quitamos el último caracter
      const cleanRut = rut.replace(/[^0-9kK]/g, ""); 
      const rutBody = cleanRut.slice(0, -1);
      
      // La contraseña será el cuerpo numérico
      const pass = await bcrypt.hash(rutBody, 10); 
      
      // Creamos usuario login
      await db.insert(users).values({ 
          id: uid, email, password: pass, name, role: 'driver', createdAt: new Date() 
      }); 
      
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
      
      // Creamos perfil conductor
      await db.insert(drivers).values(dData); 
      
      await logAction(req.user, "CREATE", "Driver", `Creado conductor manualmente: ${name}`, did);

      res.status(201).json(dData); 
    } catch (e) { 
        console.error("Error creating driver:", e); 
        res.status(500).send("Error creando conductor"); 
    } 
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
  
  // --- VEHÍCULOS ---
  app.get("/api/vehicles", verifyAuth, async (req, res) => { 
      const all = await db.query.vehicles.findMany(); 
      res.json(all); 
  });

  app.post("/api/vehicles", verifyAuth, async (req, res) => { 
    try { 
      const vid = randomUUID(); 
      const vData = { 
          ...req.body, 
          id: vid, 
          createdAt: new Date(), 
          status: 'active' 
      }; 
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
  // PAGOS
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
          const proof = req.body.proofOfPayment; 
          
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
          
          const driverInfo = await db.query.drivers.findFirst({ where: eq(drivers.id, pData.driverId) });
          const vehicleInfo = await db.query.vehicles.findFirst({ where: eq(vehicles.id, pData.vehicleId) });
          const driverName = driverInfo?.name || "Conductor";
          const plate = vehicleInfo?.plate || "Sin patente";

          await logAction(req.user, "CREATE", "Payment", `Pago: $${pData.amount} de ${driverName}`, pid);

          // 🔔 AVISO AL ADMIN (VERDE)
          await notifyAdmins(
            "success", 
            "✅ Pago Confirmado", 
            `El conductor ${driverName} (Patente: ${plate}) ha pagado $${pData.amount}.`, 
            "/payments"
          );

          // 🔔 AVISO AL CONDUCTOR (VERDE)
          // 🟢 CORREGIDO: Se usa driverInfo.userId
          if (driverInfo && driverInfo.userId) {
              await notifyUser(
                  driverInfo.userId,
                  "success",
                  "Pago Registrado",
                  `Tu pago de $${pData.amount} fue recibido. Puedes circular con normalidad.`,
                  "/payments"
              );
          }

          res.status(201).json(pData); 
      } catch (e) { res.status(500).send("Error guardando el pago"); } 
  });

  app.put("/api/payments/:id", verifyAuth, async (req, res) => {
    try {
        const pId = req.params.id;
        const data: any = { ...req.body };
        if (data.amount) data.amount = parseInt(data.amount);
        await db.update(payments).set(data).where(eq(payments.id, pId));
        await logAction(req.user, "MODIFY", "Payment", `Pago actualizado ID: ...${pId.slice(-6)}`, pId);
        res.json({ message: "Pago actualizado" });
    } catch (e) { res.status(500).json({ message: "Error al actualizar" }); }
  });

  app.delete("/api/payments/:id", verifyAuth, async (req, res) => { 
    try { 
      await db.delete(payments).where(eq(payments.id, req.params.id)); 
      await logAction(req.user, "DELETE", "Payment", `Pago eliminado`, req.params.id);
      res.json({ message: "Eliminado" }); 
    } catch (e) { res.status(500).send("Error eliminando"); } 
  });

    // =====================================================
  // LOGOUT REAL (INVALIDA SESIÓN + TOKEN)
  // =====================================================
  app.post("/api/logout", verifyAuth, (req, res) => {
    try {
      if ((req as any).logout) {
        (req as any).logout(() => {});
      }

      res.clearCookie("connect.sid");
      res.clearCookie("auth_token");

      return res.json({ success: true });
    } catch (e) {
      console.error("Logout error:", e);
      return res.status(500).json({ success: false });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}