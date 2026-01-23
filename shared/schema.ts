import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --------------------------------------------------------------------------
// 1. CONSTANTES Y LEGACY (Lo que el Frontend necesita para no romperse)
// --------------------------------------------------------------------------
export const orderStatuses = ["recibido", "diagnostico", "en_curso", "listo", "entregado"] as const;
export type OrderStatus = typeof orderStatuses[number];

export const paymentMethods = ["efectivo", "tarjeta", "transferencia"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// --- RESTAURADO: CHECKLIST SCHEMA (Para evitar el error del plugin) ---
export const checklistValue = z.enum(["yes", "no", "unknown"]);
export type ChecklistValue = z.infer<typeof checklistValue>;

export const intakeChecklistSchema = z.object({
  charges: checklistValue.optional(),
  powersOn: checklistValue.optional(),
  dropped: checklistValue.optional(),
  wet: checklistValue.optional(),
  openedBefore: checklistValue.optional(),
  inWarranty: checklistValue.optional(),
});
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// 2. DEFINICIÓN DE TABLAS (Drizzle)
// --------------------------------------------------------------------------

// --- USERS ---
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// --- CLIENTS ---
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  dni: text("dni").default(""),
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  whoPicksUp: text("who_picks_up").default(""),
  notes: text("notes").default(""),
});

// --- DEVICES ---
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  clientId: text("client_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  imei: text("imei").default(""),
  serialNumber: text("serial_number").default(""),
  color: text("color").default(""),
  condition: text("condition").default(""),
  lockType: text("lock_type").default(""),
  lockValue: text("lock_value").default(""),
});

// --- REPAIR ORDERS ---
export const repairOrders = pgTable("repair_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  clientId: text("client_id").notNull(),
  deviceId: text("device_id").notNull(),
  status: text("status").notNull().default("recibido"),

  problem: text("problem").notNull(),
  diagnosis: text("diagnosis").default(""),
  solution: text("solution").default(""),
  technicianName: text("technician_name").default(""),

  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }).default("0"),
  finalCost: decimal("final_cost", { precision: 10, scale: 2 }).default("0"),

  estimatedDate: timestamp("estimated_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"),
  priority: text("priority").default("normal"),
  notes: text("notes").default(""),
  intakeChecklist: jsonb("intake_checklist").default({}),
});

// --- PRODUCTS ---
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  sku: text("sku").default(""),
  quantity: integer("quantity").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  category: text("category").default("General"),
  lowStockThreshold: integer("low_stock_threshold").default(5),
});

// --- PAYMENTS ---
export interface PaymentItem {
  type: "product" | "repair" | "other";
  id?: string;
  name: string;
  quantity: number;
  price: number;
}

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  orderId: text("order_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes").default(""),
  items: jsonb("cart_items").$type<PaymentItem[]>(),
});

// --- EXPENSES ---
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

// --- SETTINGS ---
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  shopName: text("shop_name").notNull().default("Mi Taller"),
  address: text("address").default(""),
  phone: text("phone").default(""),
  receiptDisclaimer: text("receipt_disclaimer").default("Garantía de 30 días."),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// --------------------------------------------------------------------------
// 3. SCHEMAS & TYPES (ZOD + TS)
// --------------------------------------------------------------------------

// Helpers
export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Clients
export const insertClientSchema = createInsertSchema(clients);
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Devices
export const insertDeviceSchema = createInsertSchema(devices);
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Repair Orders (Hack para decimales)
export const insertRepairOrderSchema = createInsertSchema(repairOrders, {
  estimatedCost: z.coerce.number(),
  finalCost: z.coerce.number()
});
export type RepairOrder = Omit<typeof repairOrders.$inferSelect, "estimatedCost" | "finalCost"> & {
  estimatedCost: number;
  finalCost: number;
};
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

// Products
export const insertProductSchema = createInsertSchema(products, {
  price: z.coerce.number(),
  cost: z.coerce.number(),
  quantity: z.coerce.number(),
});
export type Product = Omit<typeof products.$inferSelect, "price" | "cost"> & {
  price: number;
  cost: number;
};
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Payments
export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.coerce.number(),
}).pick({
  orderId: true,
  amount: true,
  method: true,
  notes: true,
  items: true
});
export type Payment = Omit<typeof payments.$inferSelect, "amount"> & {
  amount: number;
};
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Expenses (Arregla el Error 400 y el type mismatch)
export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),     // Convierte string ISO a Date
  amount: z.coerce.number()  // Convierte "12000" a 12000
}).pick({
  category: true,
  description: true,
  amount: true,
  date: true,
});
export type Expense = Omit<typeof expenses.$inferSelect, "amount"> & {
  amount: number;
};
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Settings
export const insertSettingsSchema = createInsertSchema(settings).pick({
  shopName: true,
  address: true,
  phone: true,
  receiptDisclaimer: true,
});
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Relations
export interface RepairOrderWithDetails extends RepairOrder {
  client: Client;
  device: Device;
  payments?: Payment[];
}