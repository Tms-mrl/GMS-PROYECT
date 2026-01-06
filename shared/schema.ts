import { z } from "zod";

// Status types for repair orders
export const orderStatuses = ["recibido", "diagnostico", "en_curso", "listo", "entregado"] as const;
export type OrderStatus = typeof orderStatuses[number];

// Payment methods
export const paymentMethods = ["efectivo", "tarjeta", "transferencia"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// Client schema
export interface Client {
  id: string;
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

// Device schema
export type LockType = "PIN" | "PATRON" | "PASSWORD" | "";

export interface Device {
  id: string;
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

// Repair Order schema
export interface RepairOrder {
  id: string;
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
});

export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

// Payment schema
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
}

export const insertPaymentSchema = z.object({
  orderId: z.string().min(1, "Orden requerida"),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  method: z.enum(paymentMethods),
  notes: z.string(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Extended types with relations
export interface RepairOrderWithDetails extends RepairOrder {
  client: Client;
  device: Device;
  payments: Payment[];
}

// Keep existing user types for compatibility
export interface User {
  id: string;
  username: string;
  password: string;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
