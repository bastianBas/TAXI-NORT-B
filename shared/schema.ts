import { mysqlTable, varchar, text, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("driver"),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = mysqlTable("drivers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 20 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  commune: varchar("commune", { length: 100 }).notNull(),
  address: varchar("address", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 50 }).notNull(),
  licenseClass: varchar("license_class", { length: 10 }).notNull(),
  licenseDate: varchar("license_date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});

export const vehicles = mysqlTable("vehicles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  plate: varchar("plate", { length: 20 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerRut: varchar("owner_rut", { length: 20 }).notNull(),
  technicalReviewDate: varchar("technical_review_date", { length: 50 }).notNull(),
  circulationPermitDate: varchar("circulation_permit_date", { length: 50 }).notNull(),
  soapDate: varchar("soap_date", { length: 50 }).notNull(),
  authorizationDate: varchar("authorization_date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});

export const routeSlips = mysqlTable("route_slips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  date: varchar("date", { length: 50 }).notNull(),
  vehicleId: varchar("vehicle_id", { length: 36 }).notNull(),
  driverId: varchar("driver_id", { length: 36 }).notNull(),
  startTime: varchar("start_time", { length: 20 }).notNull(),
  endTime: varchar("end_time", { length: 20 }).notNull(),
  signatureUrl: text("signature_url"),
  
  // ESTE ES EL ESTADO QUE PEDISTE (por defecto 'pending' = no pagada)
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"),
  
  notes: text("notes"),
  isDuplicate: boolean("is_duplicate").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// 🟢 PAGOS ACTUALIZADOS: Ahora vinculado a una Hoja de Ruta
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  routeSlipId: varchar("route_slip_id", { length: 36 }).notNull(), // <--- VÍNCULO CLAVE
  
  type: varchar("type", { length: 50 }).notNull(), // Será siempre 'daily'
  amount: int("amount").notNull(), // Será siempre 1800
  
  // Mantenemos estos por redundancia histórica, pero se llenarán solos
  driverId: varchar("driver_id", { length: 36 }).notNull(),
  vehicleId: varchar("vehicle_id", { length: 36 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  
  proofOfPayment: text("proof_of_payment"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // Estado del PROCESO de pago (ej: revisión)
  createdAt: timestamp("created_at").defaultNow()
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertRouteSlipSchema = createInsertSchema(routeSlips).omit({ id: true, createdAt: true, isDuplicate: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

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

export type VehicleLocation = { vehicleId: string; plate: string; lat: number; lng: number; status: string; timestamp: number; };