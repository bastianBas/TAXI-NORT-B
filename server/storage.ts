import { users, drivers, vehicles, routeSlips, payments, auditLogs, notifications, gpsHistory } from "@shared/schema";
import type { User, InsertUser, Driver, InsertDriver, Vehicle, InsertVehicle, RouteSlip, InsertRouteSlip, Payment, InsertPayment, AuditLog, InsertAuditLog, VehicleLocation, Notification, InsertNotification, GpsHistory, InsertGpsHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firebaseDb } from "./firebase";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getAllVehicleLocations(): Promise<VehicleLocation[]>;
  removeVehicleLocation(vehicleId: string): Promise<void>;
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  getAdmins(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.email, email) });
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, role: insertUser.role ?? "driver", createdAt: new Date() };
    await db.insert(users).values(user);
    return user;
  }
  async getDriver(id: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.id, id) });
  }
  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.userId, userId) });
  }
  // 🟢 CORRECCIÓN TIPO DRIVER
  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    const driver: Driver = { 
      ...insertDriver, 
      id, 
      userId: insertDriver.userId ?? null,
      email: insertDriver.email ?? null,
      address: insertDriver.address ?? null,
      status: insertDriver.status ?? "active", 
      createdAt: new Date() 
    };
    await db.insert(drivers).values(driver);
    return driver;
  }
  
  // GPS & FIREBASE
  async updateVehicleLocation(location: VehicleLocation): Promise<void> {
    if (!firebaseDb) return;
    await firebaseDb.ref(`locations/${location.vehicleId}`).set({ ...location, timestamp: Date.now() });
  }
  async removeVehicleLocation(vehicleId: string): Promise<void> {
    if (!firebaseDb) return;
    await firebaseDb.ref(`locations/${vehicleId}`).remove();
  }
  async getAllVehicleLocations(): Promise<VehicleLocation[]> {
    if (!firebaseDb) return [];
    try {
      const snapshot = await firebaseDb.ref("locations").once("value");
      const data = snapshot.val();
      if (!data) return [];
      const locations: any[] = Object.values(data);
      // Limpieza de emergencia cada 60s
      const TIMEOUT_MS = 60000; 
      return locations.filter((loc: any) => loc.timestamp && (Date.now() - loc.timestamp < TIMEOUT_MS)) as VehicleLocation[];
    } catch (e) { return []; }
  }

  // NOTIFICACIONES
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  // 🟢 CORRECCIÓN TIPO NOTIFICACION
  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotif: Notification = { 
      id, ...insertNotif, link: insertNotif.link ?? null, read: false, createdAt: new Date() 
    };
    await db.insert(notifications).values(newNotif);
    return newNotif;
  }
  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  async getAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "admin"));
  }
}
export default new DatabaseStorage();