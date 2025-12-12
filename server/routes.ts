import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, verifyAuth } from "./auth"; 
import { db } from "./db"; // Corregido: Importación local
import { drivers, routeSlips, vehicles, payments } from "@shared/schema"; // Corregido: Importación desde @shared
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto"; // Importamos generador de IDs nativo

export function registerRoutes(app: Express): Server {
  // Configuración de rutas de Login/Register
  setupAuth(app);

  // --- API: HOJAS DE RUTA ---
  // Usamos 'verifyAuth' para proteger la ruta
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    if (!req.user) return res.status(401).send("No autorizado");

    try {
      // CASO ADMIN: Devuelve todas las hojas
      if (req.user.role === 'admin') {
        const allSlips = await db.query.routeSlips.findMany({
          with: {
            driver: true,
            vehicle: true,
          },
          // Usamos 'slips' en el callback para evitar conflicto de nombres
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        return res.json(allSlips);
      }

      // CASO DRIVER: Devuelve solo las suyas
      if (req.user.role === 'driver') {
        // 1. Buscamos el perfil del conductor
        const driverProfile = await db.query.drivers.findFirst({
          where: eq(drivers.userId, req.user.id),
        });

        if (!driverProfile) {
          console.log(`Usuario ${req.user.id} es driver pero no tiene perfil en tabla drivers`);
          return res.json([]);
        }

        // 2. Buscamos las hojas de ese conductor
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

  // --- CREAR HOJA DE RUTA (Solo Admin) ---
  // CORRECCIÓN PRINCIPAL: Eliminamos .returning() y generamos ID manual
  app.post("/api/route-slips", verifyAuth, async (req, res) => {
    // Verificar rol manualmente ya que verifyAuth solo verifica login
    if (req.user?.role !== 'admin') {
      return res.status(403).send("No autorizado");
    }

    try {
      // 1. Generamos el ID y la fecha manualmente
      const newId = randomUUID();
      const newDate = new Date();

      const newSlipData = {
        ...req.body,
        id: newId,
        createdAt: newDate,
      };

      // 2. Insertamos sin .returning() (MySQL no lo soporta)
      await db.insert(routeSlips).values(newSlipData);

      // 3. Devolvemos el objeto que acabamos de crear
      res.json(newSlipData);

    } catch (error) {
      console.error("Error creando hoja de ruta:", error);
      res.status(500).send("Error al crear hoja de ruta");
    }
  });

  // --- API: PAGOS ---
  app.get("/api/payments", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      if (req.user.role === 'admin') {
        const allPayments = await db.query.payments.findMany({
          with: { routeSlip: true },
          // Corregido: payments.date (según tu schema) y nombre de variable 'p'
          orderBy: (p, { desc }) => [desc(p.date)],
        });
        return res.json(allPayments);
      } 
      
      if (req.user.role === 'driver') {
        const driverProfile = await db.query.drivers.findFirst({
          where: eq(drivers.userId, req.user.id),
        });
        
        if (!driverProfile) return res.json([]);

        // Obtenemos hojas del conductor para filtrar pagos
        const mySlips = await db.query.routeSlips.findMany({
          where: eq(routeSlips.driverId, driverProfile.id),
        });
        
        const slipIds = mySlips.map(s => s.id);
        
        if (slipIds.length === 0) return res.json([]);

        // Buscamos pagos y filtramos en memoria (solución compatible con MySQL simple)
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
    
    // Usamos variable 'd' para evitar conflicto con import 'drivers'
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