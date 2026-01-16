import { z } from "zod";

// Status types for repair orders
export const orderStatuses = ["recibido", "diagnostico", "en_curso", "listo", "entregado"] as const;
export type OrderStatus = typeof orderStatuses[number];

// Payment methods
export const paymentMethods = ["efectivo", "tarjeta", "transferencia"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// --- CLIENTS ---
export interface Client {
  id: string;
  userId: string;
  name: string;
  dni: string;
  address: string;
  phone: string;
  email: string;
  whoPicksUp: string;
  notes: string;
}

export const insertClientSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  dni: z.string().min(1, "El DNI/Documento es requerido"),
  address: z.string().min(1, "La dirección es requerida"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").or(z.literal("")),
  whoPicksUp: z.string().optional(),
  notes: z.string(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;

// --- DEVICES ---
export type LockType = "PIN" | "PATRON" | "PASSWORD" | "";

export interface Device {
  id: string;
  userId: string;
  clientId: string;
  brand: string;
  model: string;
  imei: string;
  serialNumber: string;
  color: string;
  condition: string;
  lockType: LockType;
  lockValue: string;
}

export const insertDeviceSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  imei: z.string(),
  serialNumber: z.string(),
  color: z.string(),
  condition: z.string(),
  lockType: z.enum(["PIN", "PATRON", "PASSWORD"]).or(z.literal("")).optional(),
  lockValue: z.string().optional(),
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// --- INTAKE CHECKLIST ---
export const checklistValue = z.enum(["yes", "no", "unknown"]);
export type ChecklistValue = z.infer<typeof checklistValue>;

export interface IntakeChecklist {
  charges?: ChecklistValue;
  powersOn?: ChecklistValue;
  dropped?: ChecklistValue;
  wet?: ChecklistValue;
  openedBefore?: ChecklistValue;
  inWarranty?: ChecklistValue;
}

export const intakeChecklistSchema = z.object({
  charges: checklistValue.optional(),
  powersOn: checklistValue.optional(),
  dropped: checklistValue.optional(),
  wet: checklistValue.optional(),
  openedBefore: checklistValue.optional(),
  inWarranty: checklistValue.optional(),
});

// --- REPAIR ORDERS ---
export interface RepairOrder {
  id: string;
  userId: string;
  clientId: string;
  deviceId: string;
  status: OrderStatus;
  problem: string;
  diagnosis: string;
  solution: string;
  technicianName: string;
  estimatedCost: number;
  finalCost: number;
  createdAt: string;
  estimatedDate: string;
  completedAt: string | null;
  deliveredAt: string | null;
  priority: "normal" | "urgente";
  notes: string;
  intakeChecklist: IntakeChecklist;
}

export const insertRepairOrderSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  deviceId: z.string().min(1, "Dispositivo requerido"),
  status: z.enum(orderStatuses).default("recibido"),
  problem: z.string().min(1, "Describa el problema"),
  diagnosis: z.string(),
  solution: z.string(),
  technicianName: z.string(),
  estimatedCost: z.number().min(0),
  finalCost: z.number().min(0),
  estimatedDate: z.string(),
  priority: z.enum(["normal", "urgente"]).default("normal"),
  notes: z.string(),
  intakeChecklist: intakeChecklistSchema.default({}),
});

export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

// --- PAYMENTS (MODIFICADO: orderId ahora es opcional) ---
export interface Payment {
  id: string;
  userId: string;
  orderId: string | null; // <--- CAMBIO: Ahora puede ser null (pago suelto)
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
}

export const insertPaymentSchema = z.object({
  orderId: z.string().nullable().optional(), // <--- CAMBIO: Opcional
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  method: z.enum(paymentMethods),
  notes: z.string(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// --- NEW: BUSINESS SETTINGS (CONFIGURACIÓN) ---
export interface BusinessSettings {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string; // CUIT/RUT
  logoUrl: string;
  termsAndConditions: string;
}

export const insertSettingsSchema = z.object({
  businessName: z.string().min(1, "Nombre del negocio requerido"),
  address: z.string(),
  phone: z.string(),
  email: z.string().email().or(z.literal("")),
  website: z.string().optional(),
  taxId: z.string().optional(),
  logoUrl: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// --- NEW: INVENTORY / STOCK ---
export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  sku: string; // Código de barras o interno
  quantity: number;
  price: number; // Precio de venta
  cost: number;  // Costo de compra
  category: string;
  lowStockThreshold: number; // Avisar si baja de esta cantidad
}

export const insertProductSchema = z.object({
  name: z.string().min(1, "Nombre del producto requerido"),
  description: z.string(),
  sku: z.string(),
  quantity: z.number().int().min(0),
  price: z.number().min(0),
  cost: z.number().min(0),
  category: z.string(),
  lowStockThreshold: z.number().int().default(5),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

// --- EXTENDED TYPES ---
export interface RepairOrderWithDetails extends RepairOrder {
  client: Client;
  device: Device;
  payments: Payment[];
}

export interface User {
  id: string;
  username: string;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;