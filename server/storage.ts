import { users, drivers, vehicles, routeSlips, payments, auditLogs } from "@shared/schema";
import type { User, InsertUser, Driver, InsertDriver, Vehicle, InsertVehicle, RouteSlip, InsertRouteSlip, Payment, InsertPayment, AuditLog, InsertAuditLog, VehicleLocation } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firebaseDb } from "./firebase";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  getRouteSlip(id: string): Promise<RouteSlip | undefined>;
  getAllRouteSlips(): Promise<RouteSlip[]>;
  createRouteSlip(slip: InsertRouteSlip): Promise<RouteSlip>;
  checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean>;
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getAllAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser = { ...insertUser, id, createdAt: new Date() };
    await db.insert(users).values(newUser);
    return newUser;
  }
  async getAllUsers(): Promise<User[]> { return await db.select().from(users); }
  async getDriver(id: string): Promise<Driver | undefined> { const [driver] = await db.select().from(drivers).where(eq(drivers.id, id)); return driver; }
  async getAllDrivers(): Promise<Driver[]> { return await db.select().from(drivers); }
  async createDriver(insertDriver: InsertDriver): Promise<Driver> { const id = randomUUID(); const newDriver = { ...insertDriver, id, createdAt: new Date() }; await db.insert(drivers).values(newDriver); return newDriver; }
  async updateDriver(id: string, insertDriver: Partial<InsertDriver>): Promise<Driver | undefined> { await db.update(drivers).set(insertDriver).where(eq(drivers.id, id)); return this.getDriver(id); }
  async deleteDriver(id: string): Promise<boolean> { const [result] = await db.delete(drivers).where(eq(drivers.id, id)); return (result as any).affectedRows > 0; }
  async getVehicle(id: string): Promise<Vehicle | undefined> { const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)); return vehicle; }
  async getAllVehicles(): Promise<Vehicle[]> { return await db.select().from(vehicles); }
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> { const id = randomUUID(); const newVehicle = { ...insertVehicle, id, createdAt: new Date() }; await db.insert(vehicles).values(newVehicle); return newVehicle; }
  async updateVehicle(id: string, insertVehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> { await db.update(vehicles).set(insertVehicle).where(eq(vehicles.id, id)); return this.getVehicle(id); }
  async deleteVehicle(id: string): Promise<boolean> { const [result] = await db.delete(vehicles).where(eq(vehicles.id, id)); return (result as any).affectedRows > 0; }
  async getRouteSlip(id: string): Promise<RouteSlip | undefined> { const [slip] = await db.select().from(routeSlips).where(eq(routeSlips.id, id)); return slip; }
  async getAllRouteSlips(): Promise<RouteSlip[]> { return await db.select().from(routeSlips).orderBy(desc(routeSlips.createdAt)); }
  async checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean> { const [existing] = await db.select().from(routeSlips).where(and(eq(routeSlips.driverId, driverId), eq(routeSlips.vehicleId, vehicleId), eq(routeSlips.date, date))); return !!existing; }
  async createRouteSlip(insertSlip: InsertRouteSlip): Promise<RouteSlip> { const id = randomUUID(); const isDuplicate = await this.checkDuplicateRouteSlip(insertSlip.driverId, insertSlip.vehicleId, insertSlip.date); const newSlip = { ...insertSlip, id, isDuplicate, createdAt: new Date() }; await db.insert(routeSlips).values(newSlip); return newSlip; }
  async getPayment(id: string): Promise<Payment | undefined> { const [payment] = await db.select().from(payments).where(eq(payments.id, id)); return payment; }
  async getAllPayments(): Promise<Payment[]> { return await db.select().from(payments).orderBy(desc(payments.createdAt)); }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> { const id = randomUUID(); const newPayment = { ...insertPayment, id, createdAt: new Date() }; await db.insert(payments).values(newPayment); return newPayment; }
  async getAllAuditLogs(): Promise<AuditLog[]> { return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)); }
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> { const id = randomUUID(); const newLog = { ...insertLog, id, timestamp: new Date() }; await db.insert(auditLogs).values(newLog); return newLog; }
  async updateVehicleLocation(location: VehicleLocation): Promise<void> { if (!firebaseDb) return; try { const ref = firebaseDb.ref(`locations/${location.vehicleId}`); await ref.set({ ...location, timestamp: Date.now() }); } catch (error) { console.error("Error actualizando ubicación en Firebase:", error); } }
  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null> { if (!firebaseDb) return null; try { const ref = firebaseDb.ref(`locations/${vehicleId}`); const snapshot = await ref.once('value'); return snapshot.val() as VehicleLocation | null; } catch (error) { console.error("Error obteniendo ubicación de Firebase:", error); return null; } }
}
export const storage = new DatabaseStorage();