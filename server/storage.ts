// server/storage.ts

import { users, drivers, vehicles, routeSlips, payments, auditLogs, notifications } from "@shared/schema";
import type { User, InsertUser, Driver, InsertDriver, Vehicle, InsertVehicle, RouteSlip, InsertRouteSlip, Payment, InsertPayment, AuditLog, InsertAuditLog, VehicleLocation, Notification, InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firebaseDb } from "./firebase"; 
import bcrypt from "bcryptjs"; 

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>; 
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
  updateRouteSlip(id: string, slip: Partial<InsertRouteSlip>): Promise<RouteSlip | undefined>;
  checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean>;
  
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  getAllAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // 🟢 MÉTODOS DE NOTIFICACIONES
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  getAdmins(): Promise<User[]>; 
  
  // MÉTODOS GPS
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null>;
  getAllVehicleLocations(): Promise<VehicleLocation[]>; 
  removeVehicleLocation(vehicleId: string): Promise<void>; 
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> { const [user] = await db.select().from(users).where(eq(users.id, id)); return user; }
  async getUserByEmail(email: string): Promise<User | undefined> { const [user] = await db.select().from(users).where(eq(users.email, email)); return user; }
  async createUser(insertUser: InsertUser): Promise<User> { const id = randomUUID(); const newUser = { ...insertUser, id, createdAt: new Date(), role: insertUser.role ?? "driver" } as User; await db.insert(users).values(newUser); return newUser; }
  async getAllUsers(): Promise<User[]> { return await db.select().from(users); }
  
  async getDriver(id: string): Promise<Driver | undefined> { const [driver] = await db.select().from(drivers).where(eq(drivers.id, id)); return driver; }
  async getDriverByUserId(userId: string): Promise<Driver | undefined> { const [driver] = await db.select().from(drivers).where(eq(drivers.userId, userId)); return driver; }
  async getAllDrivers(): Promise<Driver[]> { return await db.select().from(drivers); }
  async createDriver(insertDriver: InsertDriver): Promise<Driver> { const id = randomUUID(); let userId = null; if (insertDriver.email) { const existingUser = await this.getUserByEmail(insertDriver.email); if (existingUser) { userId = existingUser.id; } else { const hashedPassword = await bcrypt.hash(insertDriver.rut, 10); const newUser = await this.createUser({ email: insertDriver.email, name: insertDriver.name, password: hashedPassword, role: "driver" }); userId = newUser.id; } } const newDriver = { ...insertDriver, id, userId, createdAt: new Date(), status: insertDriver.status ?? "active" } as Driver; await db.insert(drivers).values(newDriver); return newDriver; }
  async updateDriver(id: string, insertDriver: Partial<InsertDriver>): Promise<Driver | undefined> { await db.update(drivers).set(insertDriver).where(eq(drivers.id, id)); return this.getDriver(id); }
  async deleteDriver(id: string): Promise<boolean> { const [result] = await db.delete(drivers).where(eq(drivers.id, id)); return (result as any).affectedRows > 0; }
  
  async getVehicle(id: string): Promise<Vehicle | undefined> { const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)); return vehicle; }
  async getAllVehicles(): Promise<Vehicle[]> { return await db.select().from(vehicles); }
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> { const id = randomUUID(); const newVehicle = { ...insertVehicle, id, createdAt: new Date(), status: insertVehicle.status ?? "active" } as Vehicle; await db.insert(vehicles).values(newVehicle); return newVehicle; }
  async updateVehicle(id: string, insertVehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> { await db.update(vehicles).set(insertVehicle).where(eq(vehicles.id, id)); return this.getVehicle(id); }
  async deleteVehicle(id: string): Promise<boolean> { const [result] = await db.delete(vehicles).where(eq(vehicles.id, id)); return (result as any).affectedRows > 0; }
  
  async getRouteSlip(id: string): Promise<RouteSlip | undefined> { const [slip] = await db.select().from(routeSlips).where(eq(routeSlips.id, id)); return slip; }
  async getAllRouteSlips(): Promise<RouteSlip[]> { return await db.select().from(routeSlips).orderBy(desc(routeSlips.createdAt)); }
  async checkDuplicateRouteSlip(driverId: string, vehicleId: string, date: string): Promise<boolean> { const [existing] = await db.select().from(routeSlips).where(and(eq(routeSlips.driverId, driverId), eq(routeSlips.vehicleId, vehicleId), eq(routeSlips.date, date))); return !!existing; }
  async createRouteSlip(insertSlip: InsertRouteSlip): Promise<RouteSlip> { const id = randomUUID(); const isDuplicate = await this.checkDuplicateRouteSlip(insertSlip.driverId, insertSlip.vehicleId, insertSlip.date); const newSlip = { ...insertSlip, id, isDuplicate, createdAt: new Date(), paymentStatus: insertSlip.paymentStatus ?? "pending", notes: insertSlip.notes ?? null, signatureUrl: insertSlip.signatureUrl ?? null, startTime: insertSlip.startTime, endTime: insertSlip.endTime } as RouteSlip; await db.insert(routeSlips).values(newSlip); return newSlip; }
  async updateRouteSlip(id: string, insertSlip: Partial<InsertRouteSlip>): Promise<RouteSlip | undefined> { await db.update(routeSlips).set(insertSlip).where(eq(routeSlips.id, id)); return this.getRouteSlip(id); }
  
  async getPayment(id: string): Promise<Payment | undefined> { const [payment] = await db.select().from(payments).where(eq(payments.id, id)); return payment; }
  async getAllPayments(): Promise<Payment[]> { return await db.select().from(payments).orderBy(desc(payments.createdAt)); }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> { const id = randomUUID(); const newPayment = { ...insertPayment, id, createdAt: new Date(), status: insertPayment.status ?? "pending", proofOfPayment: insertPayment.proofOfPayment ?? null } as Payment; await db.insert(payments).values(newPayment); if (newPayment.routeSlipId) { await db.update(routeSlips).set({ paymentStatus: "paid" }).where(eq(routeSlips.id, newPayment.routeSlipId)); } return newPayment; }
  async updatePayment(id: string, insertPayment: Partial<InsertPayment>): Promise<Payment | undefined> { const oldPayment = await this.getPayment(id); if (oldPayment && insertPayment.routeSlipId && oldPayment.routeSlipId !== insertPayment.routeSlipId) { await db.update(routeSlips).set({ paymentStatus: "pending" }).where(eq(routeSlips.id, oldPayment.routeSlipId)); await db.update(routeSlips).set({ paymentStatus: "paid" }).where(eq(routeSlips.id, insertPayment.routeSlipId)); } await db.update(payments).set(insertPayment).where(eq(payments.id, id)); return this.getPayment(id); }
  
  async getAllAuditLogs(): Promise<AuditLog[]> { return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)); }
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> { const id = randomUUID(); const newLog = { ...insertLog, id, timestamp: new Date(), entityId: insertLog.entityId ?? null, details: insertLog.details ?? null } as AuditLog; await db.insert(auditLogs).values(newLog); return newLog; }

  // 🟢 IMPLEMENTACIÓN DE NOTIFICACIONES
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotif = { ...insertNotif, id, createdAt: new Date(), read: false };
    await db.insert(notifications).values(newNotif);
    return newNotif as Notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async getAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "admin"));
  }
  
  // 🟢 IMPLEMENTACIÓN GPS (Estabilidad + Borrado Inmediato)
  
  async updateVehicleLocation(location: VehicleLocation): Promise<void> { 
    if (!firebaseDb) return; 
    try { 
        const ref = firebaseDb.ref(`locations/${location.vehicleId}`); 
        await ref.set({ 
            ...location, 
            timestamp: Date.now() 
        }); 
    } catch (error) { 
        console.error("Error actualizando ubicación en Firebase:", error); 
    } 
  }

  async removeVehicleLocation(vehicleId: string): Promise<void> {
    if (!firebaseDb) return;
    try {
        await firebaseDb.ref(`locations/${vehicleId}`).remove();
    } catch (error) {
        console.error("Error eliminando ubicación de Firebase:", error);
    }
  }

  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null> { 
    if (!firebaseDb) return null; 
    try { 
        const ref = firebaseDb.ref(`locations/${vehicleId}`); 
        const snapshot = await ref.once('value'); 
        return snapshot.val() as VehicleLocation | null; 
    } catch (error) { 
        return null; 
    } 
  }

  // ... (imports y código anterior igual) ...

// server/storage.ts - Solo cambia la función getAllVehicleLocations al final

// ...

  async getAllVehicleLocations(): Promise<VehicleLocation[]> {
    if (!firebaseDb) return [];
    try {
        const snapshot = await firebaseDb.ref("locations").once("value");
        const data = snapshot.val();
        
        if (!data) return [];
        
        const locations: any[] = Object.values(data);
        const currentTime = Date.now();
        
        // 🟢 TIMEOUT AJUSTADO: 60 segundos. 
        // Es suficiente para aguantar mala señal, pero borra el auto 
        // razonablemente rápido si la app crashea totalmente.
        // El borrado "normal" lo maneja removeVehicleLocation al instante.
        const TIMEOUT_MS = 60000; 

        const activeLocations = locations.filter((loc: any) => {
            return loc.timestamp && (currentTime - loc.timestamp < TIMEOUT_MS);
        });
        
        return activeLocations as VehicleLocation[];
    } catch (error) {
        console.error("Error obteniendo ubicaciones:", error);
        return [];
    }
  }
}

export default new DatabaseStorage();