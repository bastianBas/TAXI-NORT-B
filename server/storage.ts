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
  
  // GPS
  updateVehicleLocation(location: VehicleLocation): Promise<void>;
  getAllVehicleLocations(): Promise<VehicleLocation[]>;
  removeVehicleLocation(vehicleId: string): Promise<void>;

  // Notificaciones y Admin
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
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role ?? "driver", 
      createdAt: new Date() 
    };
    await db.insert(users).values(user);
    return user;
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.id, id) });
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    return await db.query.drivers.findFirst({ where: eq(drivers.userId, userId) });
  }

  // 🟢 CORREGIDO: Manejo explícito de nulos
  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    
    // Construimos el objeto Driver asegurando que no haya 'undefined'
    const driver: Driver = { 
      ...insertDriver, 
      id, 
      // Si estos campos opcionales vienen undefined, los forzamos a null
      userId: insertDriver.userId ?? null,
      email: insertDriver.email ?? null,
      address: insertDriver.address ?? null,
      
      status: insertDriver.status ?? "active", 
      createdAt: new Date() 
    };
    
    await db.insert(drivers).values(driver);
    return driver;
  }

  // --- LÓGICA GPS ---
  async updateVehicleLocation(location: VehicleLocation): Promise<void> {
    if (!firebaseDb) return;
    const ref = firebaseDb.ref(`locations/${location.vehicleId}`);
    await ref.set({
      ...location,
      timestamp: Date.now() 
    });
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
      const currentTime = Date.now();
      
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

  // --- NOTIFICACIONES ---
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    
    const newNotif: Notification = { 
      id,
      userId: insertNotif.userId,
      type: insertNotif.type,
      title: insertNotif.title,
      message: insertNotif.message,
      // Si el link no viene, debe ser null, no undefined
      link: insertNotif.link ?? null, 
      read: false, 
      createdAt: new Date() 
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