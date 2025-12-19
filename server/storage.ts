import { users, drivers, vehicles, routeSlips, payments, auditLogs, notifications, gpsHistory } from "@shared/schema";
import type { User, InsertUser, Driver, InsertDriver, Vehicle, InsertVehicle, RouteSlip, InsertRouteSlip, Payment, InsertPayment, AuditLog, InsertAuditLog, VehicleLocation, Notification, InsertNotification, GpsHistory, InsertGpsHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
// Asegúrate de que este archivo exista con tu configuración de Firebase
import { firebaseDb } from "./firebase"; 
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  
  // GPS (Firebase)
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getAllVehicleLocations(): Promise<VehicleLocation[]>;
  removeVehicleLocation(vehicleId: string): Promise<void>;
  
  // Notificaciones
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Admins
  getAdmins(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // --- USUARIOS ---
  async getUser(id: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.email, email) });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
        ...insertUser, 
        id, 
        role: insertUser.role ?? "driver", 
        createdAt: new Date() 
    };
    await db.insert(users).values(user);
    return user;
  }

  // --- CONDUCTORES ---
  async getDriver(id: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.id, id) });
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.userId, userId) });
  }

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
  
  // --- GPS & FIREBASE ---
  async updateVehicleLocation(location: VehicleLocation): Promise<void> {
    if (!firebaseDb) return;
    try {
        await firebaseDb.ref(`locations/${location.vehicleId}`).set({ 
            ...location, 
            timestamp: Date.now() 
        });
    } catch (error) {
        console.error("Error updating Firebase:", error);
    }
  }

  async removeVehicleLocation(vehicleId: string): Promise<void> {
    if (!firebaseDb) return;
    try {
        await firebaseDb.ref(`locations/${vehicleId}`).remove();
    } catch (error) {
        console.error("Error removing from Firebase:", error);
    }
  }

  async getAllVehicleLocations(): Promise<VehicleLocation[]> {
    if (!firebaseDb) return [];
    try {
      const snapshot = await firebaseDb.ref("locations").once("value");
      const data = snapshot.val();
      if (!data) return [];
      
      const locations: any[] = Object.values(data);
      
      // Filtramos ubicaciones viejas (más de 60 segundos)
      const TIMEOUT_MS = 60000; 
      return locations.filter((loc: any) => 
        loc.timestamp && (Date.now() - loc.timestamp < TIMEOUT_MS)
      ) as VehicleLocation[];
    } catch (e) { 
        console.error("Error fetching form Firebase:", e);
        return []; 
    }
  }

  // --- NOTIFICACIONES ---
  async getNotifications(userId: string): Promise<Notification[]> {
    // 🟢 ESTO ESTÁ PERFECTO: Coincide con tu schema.ts
    return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.timestamp)) 
        .limit(50);
  }

  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    // 🟢 ESTO TAMBIÉN ESTÁ PERFECTO
    const newNotif: Notification = { 
      id, 
      ...insertNotif, 
      link: insertNotif.link ?? null, 
      read: false, 
      timestamp: new Date() 
    };
    await db.insert(notifications).values(newNotif);
    return newNotif;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id));
  }

  // --- ADMINS ---
  async getAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "admin"));
  }
}

export default new DatabaseStorage();