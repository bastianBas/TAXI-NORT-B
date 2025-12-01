import { mysqlTable, varchar, text, timestamp, boolean, int, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- USERS ---
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID generado en la app
  username: varchar("username", { length: 255 }).unique(), // Opcional si usas email
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("driver"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DRIVERS ---
export const drivers = mysqlTable("drivers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }), // Relación opcional con users
  name: varchar("name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 20 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  licenseNumber: varchar("license_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  address: text("address"), // Agregado por compatibilidad
  createdAt: timestamp("created_at").defaultNow(),
});

// --- VEHICLES ---
export const vehicles = mysqlTable("vehicles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  plate: varchar("plate", { length: 20 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  technicalReviewDate: varchar("technical_review_date", { length: 50 }).notNull(), // Fecha como texto o date
  year: int("year"), // Agregado por compatibilidad
  status: varchar("status", { length: 50 }).notNull().default("active"),
  assignedDriverId: varchar("assigned_driver_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- ROUTE SLIPS (Hojas de Ruta) ---
export const routeSlips = mysqlTable("route_slips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  date: varchar("date", { length: 50 }).notNull(),
  driverId: varchar("driver_id", { length: 36 }).notNull(),
  vehicleId: varchar("vehicle_id", { length: 36 }).notNull(),
  signature: text("signature"), // Base64 o URL
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"),
  notes: text("notes"),
  
  // Campos financieros
  totalAmount: int("total_amount").default(0), 
  expenses: int("expenses").default(0),
  netAmount: int("net_amount").default(0),
  
  isDuplicate: boolean("is_duplicate").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- PAYMENTS ---
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  routeSlipId: varchar("route_slip_id", { length: 36 }), // Opcional si el pago no está atado a hoja
  type: varchar("type", { length: 50 }), // 'efectivo', 'transferencia'
  amount: int("amount").notNull(),
  driverId: varchar("driver_id", { length: 36 }),
  vehicleId: varchar("vehicle_id", { length: 36 }),
  date: varchar("date", { length: 50 }),
  proofOfPayment: text("proof_of_payment"), // URL de Firebase
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  method: varchar("method", { length: 50 }), // Campo extra por si acaso
  createdAt: timestamp("created_at").defaultNow(),
});

// --- AUDIT LOGS ---
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// --- SCHEMAS DE INSERCIÓN (ZOD) ---
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertRouteSlipSchema = createInsertSchema(routeSlips).omit({ id: true, createdAt: true, isDuplicate: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

// --- TIPOS EXPORTADOS ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type RouteSlip = typeof routeSlips.$inferSelect;
export type InsertRouteSlip = z.infer<typeof insertRouteSlipSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Tipo auxiliar para ubicaciones (no va en BD relacional, suele ir en Firebase)
export type VehicleLocation = {
  vehicleId: string;
  plate: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: number;
};