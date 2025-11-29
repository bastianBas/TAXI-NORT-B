import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firebaseDb } from "./firebase"; // Importamos la conexión a Firebase

import type {
  User, InsertUser, Driver, InsertDriver, Vehicle, InsertVehicle,
  RouteSlip, InsertRouteSlip, Payment, InsertPayment, AuditLog, InsertAuditLog,
  VehicleLocation // Asegúrate de tener este tipo en schema.ts
} from "@shared/schema";

// 1. CONFIGURACIÓN DE LA CONEXIÓN A AIVEN (RELACIONAL)
const connection = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306), 
  ssl: { rejectUnauthorized: false }, // Necesario para Aiven
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = drizzle(connection, { schema, mode: "default" });

// 2. INTERFAZ DE ALMACENAMIENTO
export interface IStorage {
  // Usuarios y Roles
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Conductores
  getDriver(id: string): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;

  // Vehículos
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;

  // Hojas de Ruta
  getRouteSlip(id: string): Promise<RouteSlip | undefined>;
  getAllRouteSlips(): Promise<RouteSlip[]>;
  createRouteSlip(slip: InsertRouteSlip): Promise<RouteSlip>;
  checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean>;

  // Pagos
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Auditoría
  getAllAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // --- NUEVO: UBICACIÓN EN TIEMPO REAL (FIREBASE) ---
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null>;
}

// 3. IMPLEMENTACIÓN HÍBRIDA (MySQL + Firebase)
export class DatabaseStorage implements IStorage {
  // --- Users ---
  async getUser(id: string): Promise<User | undefined> {
    return db.query.users.findFirst({ where: eq(schema.users.id, id) });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({ where: eq(schema.users.email, email) });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    await db.insert(schema.users).values({ ...insertUser, id });
    return (await this.getUser(id))!;
  }

  async getAllUsers(): Promise<User[]> {
    return db.query.users.findMany();
  }

  // --- Drivers ---
  async getDriver(id: string): Promise<Driver | undefined> {
    return db.query.drivers.findFirst({ where: eq(schema.drivers.id, id) });
  }

  async getAllDrivers(): Promise<Driver[]> {
    return db.query.drivers.findMany();
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    await db.insert(schema.drivers).values({ ...insertDriver, id });
    return (await this.getDriver(id))!;
  }

  async updateDriver(id: string, driverData: Partial<InsertDriver>): Promise<Driver | undefined> {
    await db.update(schema.drivers).set(driverData).where(eq(schema.drivers.id, id));
    return this.getDriver(id);
  }

  async deleteDriver(id: string): Promise<boolean> {
    const [result] = await db.delete(schema.drivers).where(eq(schema.drivers.id, id));
    return (result as any).affectedRows > 0;
  }

  // --- Vehicles ---
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return db.query.vehicles.findFirst({ where: eq(schema.vehicles.id, id) });
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return db.query.vehicles.findMany();
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    await db.insert(schema.vehicles).values({ ...insertVehicle, id });
    return (await this.getVehicle(id))!;
  }

  async updateVehicle(id: string, vehicleData: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    await db.update(schema.vehicles).set(vehicleData).where(eq(schema.vehicles.id, id));
    return this.getVehicle(id);
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const [result] = await db.delete(schema.vehicles).where(eq(schema.vehicles.id, id));
    return (result as any).affectedRows > 0;
  }

  // --- Route Slips ---
  async getRouteSlip(id: string): Promise<RouteSlip | undefined> {
    return db.query.routeSlips.findFirst({ where: eq(schema.routeSlips.id, id) });
  }

  async getAllRouteSlips(): Promise<RouteSlip[]> {
    return db.query.routeSlips.findMany({ orderBy: desc(schema.routeSlips.createdAt) });
  }

  async checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean> {
    const existing = await db.query.routeSlips.findFirst({
      where: and(
        eq(schema.routeSlips.driverId, driverId),
        eq(schema.routeSlips.vehicleId, vehicleId),
        eq(schema.routeSlips.date, date)
      )
    });
    return !!existing;
  }

  async createRouteSlip(insertSlip: InsertRouteSlip): Promise<RouteSlip> {
    const id = randomUUID();
    const isDuplicate = await this.checkDuplicateRouteSlip(
      insertSlip.driverId, insertSlip.vehicleId, insertSlip.date
    );
    
    await db.insert(schema.routeSlips).values({ 
      ...insertSlip, 
      id, 
      isDuplicate 
    });
    return (await this.getRouteSlip(id))!;
  }

  // --- Payments ---
  async getPayment(id: string): Promise<Payment | undefined> {
    return db.query.payments.findFirst({ where: eq(schema.payments.id, id) });
  }

  async getAllPayments(): Promise<Payment[]> {
    return db.query.payments.findMany({ orderBy: desc(schema.payments.createdAt) });
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    await db.insert(schema.payments).values({ ...insertPayment, id });
    return (await this.getPayment(id))!;
  }

  // --- Audit Logs ---
  async getAllAuditLogs(): Promise<AuditLog[]> {
    return db.query.auditLogs.findMany({ orderBy: desc(schema.auditLogs.timestamp) });
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    await db.insert(schema.auditLogs).values({ ...insertLog, id });
    const log = await db.query.auditLogs.findFirst({ where: eq(schema.auditLogs.id, id) });
    return log!;
  }

  // --- FIREBASE IMPLEMENTATION (Ubicación GPS) ---
  async updateVehicleLocation(location: VehicleLocation): Promise<void> {
    // Guardamos en la ruta 'locations/{vehicleId}'
    const ref = firebaseDb.ref(`locations/${location.vehicleId}`);
    await ref.set({
      ...location,
      timestamp: Date.now() // Actualizamos el timestamp al servidor
    });
  }

  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null> {
    const ref = firebaseDb.ref(`locations/${vehicleId}`);
    const snapshot = await ref.once('value');
    return snapshot.val() as VehicleLocation | null;
  }
}

export const storage = new DatabaseStorage();