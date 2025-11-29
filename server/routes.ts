import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { seedData } from "./seed";
import type { VehicleLocation, User } from "@shared/schema";
import bcrypt from "bcrypt"; // Necesario para la ruta de emergencia

// Configuración de Multer para subir archivos
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Middleware auxiliar para proteger rutas
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "No autenticado" });
}

function hasRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autenticado" });
    
    const user = req.user as User;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Inicializar datos semilla
  await seedData();

  // Configurar Autenticación
  setupAuth(app);

  // --- RUTA DE EMERGENCIA PARA CREAR ADMIN (¡NUEVO!) ---
  // Visita esta ruta una vez para crear o verificar el admin
  app.get("/api/emergency-create-admin", async (req, res) => {
    try {
      const email = "admin@taxinort.cl";
      const password = "admin123";
      
      // 1. Verificar si existe
      const existing = await storage.getUserByEmail(email);
      
      if (existing) {
        // Si existe, intentamos actualizar su contraseña por si acaso estaba corrupta
        const newHashedPassword = await bcrypt.hash(password, 10);
        // Nota: storage.updateUser no existe por defecto, así que solo informamos.
        // Si necesitas forzar el cambio, tendríamos que añadir updateUser a storage.ts
        // Por ahora, asumimos que si existe, avisamos.
        return res.json({ 
          status: "EXISTE", 
          message: "El usuario admin ya existe en la base de datos.",
          user: { id: existing.id, email: existing.email, role: existing.role }
        });
      }

      // 2. Crear si no existe
      console.log("🚨 Creando admin de emergencia...");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        name: "Admin Emergencia",
        email,
        password: hashedPassword,
        role: "admin"
      });
      
      res.json({ 
        status: "CREADO", 
        message: "Usuario Admin creado exitosamente. Intenta iniciar sesión ahora.", 
        credentials: { email, password } 
      });

    } catch (error) {
      console.error("Error en ruta de emergencia:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // --- RUTAS API NORMALES ---

  // Drivers routes
  app.get("/api/drivers", isAuthenticated, async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Get drivers error:", error);
      res.status(500).json({ message: "Error al obtener conductores" });
    }
  });

  app.post("/api/drivers", hasRole("admin", "operator"), async (req, res) => {
    try {
      const driver = await storage.createDriver(req.body);
      
      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "create",
        entity: "driver",
        entityId: driver.id,
        details: `Conductor creado: ${driver.name}`,
      });

      res.json(driver);
    } catch (error) {
      console.error("Create driver error:", error);
      res.status(500).json({ message: "Error al crear conductor" });
    }
  });

  app.put("/api/drivers/:id", hasRole("admin", "operator"), async (req, res) => {
    try {
      const driver = await storage.updateDriver(req.params.id, req.body);
      if (!driver) return res.status(404).json({ message: "Conductor no encontrado" });

      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "update",
        entity: "driver",
        entityId: driver.id,
        details: `Conductor actualizado: ${driver.name}`,
      });

      res.json(driver);
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(500).json({ message: "Error al actualizar conductor" });
    }
  });

  app.delete("/api/drivers/:id", hasRole("admin", "operator"), async (req, res) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "Conductor no encontrado" });

      const deleted = await storage.deleteDriver(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Error al eliminar" });

      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "delete",
        entity: "driver",
        entityId: req.params.id,
        details: `Conductor eliminado: ${driver.name}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete driver error:", error);
      res.status(500).json({ message: "Error al eliminar conductor" });
    }
  });

  // Vehicles routes
  app.get("/api/vehicles", isAuthenticated, async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Get vehicles error:", error);
      res.status(500).json({ message: "Error al obtener vehículos" });
    }
  });

  app.post("/api/vehicles", hasRole("admin", "operator"), async (req, res) => {
    try {
      const vehicle = await storage.createVehicle(req.body);
      
      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "create",
        entity: "vehicle",
        entityId: vehicle.id,
        details: `Vehículo creado: ${vehicle.plate}`,
      });

      res.json(vehicle);
    } catch (error) {
      console.error("Create vehicle error:", error);
      res.status(500).json({ message: "Error al crear vehículo" });
    }
  });

  app.put("/api/vehicles/:id", hasRole("admin", "operator"), async (req, res) => {
    try {
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) return res.status(404).json({ message: "Vehículo no encontrado" });

      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "update",
        entity: "vehicle",
        entityId: vehicle.id,
        details: `Vehículo actualizado: ${vehicle.plate}`,
      });

      res.json(vehicle);
    } catch (error) {
      console.error("Update vehicle error:", error);
      res.status(500).json({ message: "Error al actualizar vehículo" });
    }
  });

  app.delete("/api/vehicles/:id", hasRole("admin", "operator"), async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) return res.status(404).json({ message: "Vehículo no encontrado" });

      const deleted = await storage.deleteVehicle(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Error al eliminar" });

      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "delete",
        entity: "vehicle",
        entityId: req.params.id,
        details: `Vehículo eliminado: ${vehicle.plate}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete vehicle error:", error);
      res.status(500).json({ message: "Error al eliminar vehículo" });
    }
  });

  // GPS Update Route
  app.post("/api/vehicles/:id/location", async (req, res) => {
     const { lat, lng, status } = req.body;
     if (!lat || !lng) return res.status(400).send("Faltan coordenadas");
     
     await storage.updateVehicleLocation({
       vehicleId: req.params.id,
       plate: "GPS-DEVICE", 
       lat, lng, 
       status: status || "active", 
       timestamp: Date.now()
     });
     res.json({ success: true });
  });

  // Route Slips routes
  app.get("/api/route-slips", isAuthenticated, async (req, res) => {
    try {
      const slips = await storage.getAllRouteSlips();
      res.json(slips);
    } catch (error) {
      console.error("Get route slips error:", error);
      res.status(500).json({ message: "Error al obtener hojas de ruta" });
    }
  });

  app.post("/api/route-slips", isAuthenticated, async (req, res) => {
    try {
      const slip = await storage.createRouteSlip(req.body);
      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "create",
        entity: "route-slip",
        entityId: slip.id,
        details: `Hoja de ruta creada: ${slip.date}`,
      });
      res.json(slip);
    } catch (error) {
      console.error("Create route slip error:", error);
      res.status(500).json({ message: "Error al crear hoja de ruta" });
    }
  });

  // Payments routes
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Error al obtener pagos" });
    }
  });

  app.post("/api/payments", hasRole("admin", "finance"), upload.single("file"), async (req, res) => {
    try {
      const paymentData = {
        type: req.body.type,
        amount: parseInt(req.body.amount),
        driverId: req.body.driverId,
        vehicleId: req.body.vehicleId,
        date: req.body.date,
        proofOfPayment: req.file ? req.file.filename : "",
        status: req.body.status || "pending",
      };

      const payment = await storage.createPayment(paymentData);
      
      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        userName: user.email,
        action: "create",
        entity: "payment",
        entityId: payment.id,
        details: `Pago registrado: ${payment.type} - $${payment.amount}`,
      });

      res.json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ message: "Error al crear pago" });
    }
  });

  // Audit logs routes
  app.get("/api/audit", hasRole("admin"), async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Cliente GPS conectado");

    const sendGPSUpdates = async () => {
      try {
        const vehicles = await storage.getAllVehicles();
        const activeVehicles = vehicles.filter((v) => v.status === "active");

        const locations: VehicleLocation[] = activeVehicles.map((vehicle) => ({
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          lat: -33.4489 + (Math.random() - 0.5) * 0.1, 
          lng: -70.6693 + (Math.random() - 0.5) * 0.1,
          status: vehicle.status,
          timestamp: Date.now(),
        }));

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "gps-update", locations }));
        }
      } catch (err) {
        console.error("WS Error", err);
      }
    };

    sendGPSUpdates();
    const interval = setInterval(sendGPSUpdates, 3000);

    ws.on("close", () => {
      clearInterval(interval);
    });
  });

  return httpServer;
}