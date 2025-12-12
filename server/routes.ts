import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth"; 
import { db } from "./db";
import { drivers, routeSlips, vehicles, payments } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
// Usamos crypto nativo de Node.js que es estable en Cloud Run
import { randomUUID } from "crypto"; 

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // --- API: HOJAS DE RUTA (GET) ---
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    if (!req.user) return res.status(401).send("No autorizado");

    try {
      // CASO ADMIN
      if (req.user.role === 'admin') {
        const allSlips = await db.query.routeSlips.findMany({
          with: {
            driver: true,
            vehicle: true,
          },
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        return res.json(allSlips);
      }

      // CASO DRIVER
      if (req.user.role === 'driver') {
        const driverProfile = await db.query.drivers.findFirst({
          where: eq(drivers.userId, req.user.id),
        });

        if (!driverProfile) {
          console.log(`Usuario ${req.user.id} es driver pero no tiene perfil en tabla drivers`);
          return res.json([]);
        }

        const driverSlips = await db.query.routeSlips.findMany({
          where: eq(routeSlips.driverId, driverProfile.id),
          with: {
            driver: true,
            vehicle: true,
          },
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        
        return res.json(driverSlips);
      }

      return res.json([]);

    } catch (error) {
      console.error("Error obteniendo hojas de ruta:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // --- CREAR HOJA DE RUTA (POST - Solo Admin) ---
  // 🟢 CORRECCIÓN APLICADA AQUÍ
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).send("No autorizado");
    }

    try {
      // 1. Generamos solo el ID. NO generamos la fecha manualmente.
      const newId = randomUUID();
      
      // Preparamos los datos para insertar.
      // NOTA: No incluimos 'createdAt', dejamos que la BD lo ponga por defecto.
      const slipDataToInsert = {
        ...req.body, // Esto trae vehicleId, driverId, date, etc. del formulario
        id: newId,
      };

      // 2. Insertamos en la base de datos
      await db.insert(routeSlips).values(slipDataToInsert);

      // 3. Construimos la respuesta para el frontend.
      // Como MySQL no devuelve el objeto creado, simulamos la respuesta completa
      // agregando los valores por defecto que sabemos que tendrá la BD.
      const responseData = {
          ...slipDataToInsert,
          // Agregamos una fecha actual solo para que el frontend la muestre al instante
          createdAt: new Date().toISOString(), 
          // Valores por defecto de tu schema
          paymentStatus: 'pending', 
          isDuplicate: false
      };

      console.log("Hoja de ruta creada exitosamente:", newId);
      res.status(201).json(responseData);

    } catch (error) {
      // Este log ahora te dará más detalles en Cloud Run si falla
      console.error("❌ Error FATAL creando hoja de ruta en BD:", error);
      // Devolvemos un error genérico al cliente, pero el log del servidor tendrá el detalle
      res.status(500).send("Error al crear hoja de ruta en la base de datos.");
    }
  });

  // --- API: PAGOS ---
  app.get("/api/payments", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      if (req.user.role === 'admin') {
        const allPayments = await db.query.payments.findMany({
          with: { routeSlip: true },
          orderBy: (p, { desc }) => [desc(p.date)],
        });
        return res.json(allPayments);
      } 
      
      if (req.user.role === 'driver') {
        const driverProfile = await db.query.drivers.findFirst({
          where: eq(drivers.userId, req.user.id),
        });
        
        if (!driverProfile) return res.json([]);

        const mySlips = await db.query.routeSlips.findMany({
          where: eq(routeSlips.driverId, driverProfile.id),
        });
        
        const slipIds = mySlips.map(s => s.id);
        
        if (slipIds.length === 0) return res.json([]);

        const allPayments = await db.query.payments.findMany({
          with: { routeSlip: true },
          orderBy: (p, { desc }) => [desc(p.date)],
        });

        const myPayments = allPayments.filter(p => p.routeSlipId && slipIds.includes(p.routeSlipId));
        
        return res.json(myPayments);
      }

      return res.json([]);
    } catch (error) {
      console.error("Error en pagos:", error);
      res.status(500).json([]);
    }
  });

  // --- API: CONDUCTORES ---
  app.get("/api/drivers", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const allDrivers = await db.query.drivers.findMany({
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
    res.json(allDrivers);
  });

  // --- API: VEHÍCULOS ---
  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const allVehicles = await db.query.vehicles.findMany();
    res.json(allVehicles);
  });

  const httpServer = createServer(app);
  return httpServer;
}