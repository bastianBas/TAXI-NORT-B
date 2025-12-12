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

// --- CONFIGURACIÓN DE MULTER (Subida de Imágenes) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Aseguramos que la carpeta uploads exista
    const uploadPath = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único para evitar conflictos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Servir archivos estáticos (imágenes subidas)
  // Esto permite que el frontend vea las firmas en /uploads/nombre-archivo.png
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // --- API: HOJAS DE RUTA (GET) ---
  app.get("/api/route-slips", verifyAuth, async (req, res) => {
    if (!req.user) return res.status(401).send("No autorizado");

    try {
      // ADMIN: Ve todo
      if (req.user.role === 'admin') {
        const allSlips = await db.query.routeSlips.findMany({
          with: { driver: true, vehicle: true },
          orderBy: (slips, { desc }) => [desc(slips.date)],
        });
        return res.json(allSlips);
      }

      // DRIVER: Ve solo lo suyo
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
      res.status(500).json({ message: "Error interno" });
    }
  });

  // --- CREAR HOJA DE RUTA (POST) ---
  // AHORA USAMOS: upload.single('signature') para procesar la imagen y el body
  app.post("/api/route-slips", verifyAuth, upload.single('signature'), async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).send("No autorizado");
    }

    try {
      const newId = randomUUID();
      
      // Si se subió un archivo, guardamos la URL relativa
      let signatureUrl = null;
      if (req.file) {
        signatureUrl = `uploads/${req.file.filename}`; // Guardamos ruta relativa
      }

      const slipDataToInsert = {
        id: newId,
        date: req.body.date,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes || "",
        signatureUrl: signatureUrl, // Agregamos la firma
        paymentStatus: 'pending',
        isDuplicate: false
      };

      await db.insert(routeSlips).values(slipDataToInsert);

      // Respondemos con los datos simulados para que el frontend actualice rápido
      res.status(201).json({
        ...slipDataToInsert,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("❌ Error creando hoja de ruta:", error);
      res.status(500).send("Error al guardar en base de datos.");
    }
  });

  // --- EDITAR HOJA DE RUTA (PUT) ---
  app.put("/api/route-slips/:id", verifyAuth, upload.single('signature'), async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).send("No autorizado");
    }

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

      // Solo actualizamos la firma si subieron una nueva
      if (req.file) {
        updateData.signatureUrl = `uploads/${req.file.filename}`;
      }

      await db.update(routeSlips)
        .set(updateData)
        .where(eq(routeSlips.id, slipId));

      res.json({ message: "Actualizado correctamente", id: slipId });

    } catch (error) {
      console.error("Error actualizando hoja:", error);
      res.status(500).send("Error al actualizar");
    }
  });

  // --- OTRAS RUTAS (Pagos, Drivers, etc) ---
  
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

  app.get("/api/drivers", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const allDrivers = await db.query.drivers.findMany({
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });
    res.json(allDrivers);
  });

  app.get("/api/vehicles", verifyAuth, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const allVehicles = await db.query.vehicles.findMany();
    res.json(allVehicles);
  });

  const httpServer = createServer(app);
  return httpServer;
}