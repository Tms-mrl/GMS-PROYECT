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
import { supabase } from "./supabase";

// --------------------------------------------------------------------------
// 1. CONSTANTES GLOBALES (Menús desplegables)
// --------------------------------------------------------------------------
export const orderStatuses = ["recibido", "diagnostico", "en_curso", "listo", "entregado"] as const;
export type OrderStatus = typeof orderStatuses[number];

export const paymentMethods = ["efectivo", "tarjeta", "transferencia"] as const;
export type PaymentMethod = typeof paymentMethods[number];

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

  // Decimales en DB (Strings), pero los trataremos como números
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
  email: text("email").default(""),
  whatsapp: text("whatsapp").default(""),
  landline: text("landline").default(""),
  logoUrl: text("logo_url").default(""),
  cardSurcharge: decimal("card_surcharge", { precision: 10, scale: 2 }).default("0"),
  transferSurcharge: decimal("transfer_surcharge", { precision: 10, scale: 2 }).default("0"), // <--- CAMPO AGREGADO
  receiptDisclaimer: text("receipt_disclaimer").default("Garantía de 30 días."),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// --------------------------------------------------------------------------
// 3. TIPOS (INTERFACES) "PARCHEADOS"
// --------------------------------------------------------------------------

// Helpers para crear esquemas de inserción
export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Clients
export const insertClientSchema = createInsertSchema(clients).omit({ userId: true, id: true });
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Devices
export const insertDeviceSchema = createInsertSchema(devices).omit({ userId: true, id: true });
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Repair Orders (Override decimal -> number)
export const insertRepairOrderSchema = createInsertSchema(repairOrders, {
  estimatedCost: z.coerce.number(),
  finalCost: z.coerce.number()
}).omit({ userId: true, id: true });

export type RepairOrder = Omit<typeof repairOrders.$inferSelect, "estimatedCost" | "finalCost"> & {
  estimatedCost: number;
  finalCost: number;
};

export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

// Products (Override decimal -> number)
export const insertProductSchema = createInsertSchema(products, {
  price: z.coerce.number(),
  cost: z.coerce.number(),
  quantity: z.coerce.number(),
}).omit({ userId: true, id: true });

export type Product = Omit<typeof products.$inferSelect, "price" | "cost"> & {
  price: number;
  cost: number;
};
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Payments (Override decimal -> number)
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

// Expenses (Override decimal -> number)
export const insertExpenseSchema = createInsertSchema(expenses, {
  date: z.coerce.date(),
  amount: z.coerce.string()
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
export const insertSettingsSchema = createInsertSchema(settings, {
  cardSurcharge: z.coerce.number(),
  transferSurcharge: z.coerce.number(), // <--- COERCIÓN AGREGADA
}).pick({
  shopName: true,
  address: true,
  phone: true,
  email: true,
  whatsapp: true,
  landline: true,
  logoUrl: true,
  cardSurcharge: true,
  transferSurcharge: true, // <--- PERMITIDO
  receiptDisclaimer: true,
});
export type Settings = Omit<typeof settings.$inferSelect, "cardSurcharge" | "transferSurcharge"> & {
  cardSurcharge: number;
  transferSurcharge: number;
};
export type InsertSettings = z.infer<typeof insertSettingsSchema>;


// Tipos Relacionales (Auxiliares)
export interface RepairOrderWithDetails extends RepairOrder {
  client: Client;
  device: Device;
  payments?: Payment[];
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient & { userId: string }): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;

  // Devices
  getDevices(userId: string): Promise<Device[]>;
  getDevicesByClient(clientId: string): Promise<Device[]>;
  createDevice(device: InsertDevice & { userId: string }): Promise<Device>;
  updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device | undefined>;

  // Orders
  getOrdersWithDetails(userId: string): Promise<RepairOrderWithDetails[]>;
  getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined>;
  createOrder(order: InsertRepairOrder & { userId: string }): Promise<RepairOrder>;
  updateOrder(id: string, data: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined>;

  // Payments
  getPaymentsWithOrders(userId: string): Promise<(Payment & { order?: RepairOrder })[]>;
  createPayment(payment: InsertPayment & { userId: string, items: PaymentItem[] }): Promise<Payment>;

  // Products
  getProducts(userId: string): Promise<Product[]>;
  createProduct(product: InsertProduct & { userId: string }): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, userId: string): Promise<void>;

  // Expenses
  getExpenses(userId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;

  // Stats
  getStats(userId: string): Promise<any>;

  // Settings
  getSettings(userId: string): Promise<Settings | undefined>;
  updateSettings(userId: string, settings: InsertSettings): Promise<Settings>;
}

export class SupabaseStorage implements IStorage {
  // Helper to map Client snake_case -> camelCase
  private mapClient(row: any): Client {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      dni: row.dni,
      address: row.address,
      phone: row.phone,
      email: row.email,
      whoPicksUp: row.who_picks_up,
      notes: row.notes
    };
  }

  // Helper map Device
  private mapDevice(row: any): Device {
    return {
      id: row.id,
      userId: row.user_id,
      clientId: row.client_id,
      brand: row.brand,
      model: row.model,
      imei: row.imei,
      serialNumber: row.serial_number,
      color: row.color,
      condition: row.condition,
      lockType: row.lock_type,
      lockValue: row.lock_value
    };
  }

  // Helper map Order
  private mapOrder(row: any): RepairOrder {
    return {
      id: row.id,
      userId: row.user_id,
      clientId: row.client_id,
      deviceId: row.device_id,
      status: row.status,
      problem: row.problem,
      diagnosis: row.diagnosis,
      solution: row.solution,
      technicianName: row.technician_name,
      estimatedCost: parseFloat(row.estimated_cost || "0"),
      finalCost: parseFloat(row.final_cost || "0"),
      estimatedDate: row.estimated_date ? new Date(row.estimated_date) : null,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
      priority: row.priority,
      notes: row.notes,
      intakeChecklist: row.intake_checklist
    };
  }

  // Helper map Payment
  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      amount: parseFloat(row.amount || "0"),
      method: row.method,
      date: new Date(row.date),
      notes: row.notes,
      items: row.cart_items
    };
  }

  // Helper map Settings
  private mapSettings(row: any): Settings {
    return {
      id: row.id,
      userId: row.user_id,
      shopName: row.shop_name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      whatsapp: row.whatsapp,
      landline: row.landline,
      logoUrl: row.logo_url,
      cardSurcharge: parseFloat(row.card_surcharge || "0"),
      transferSurcharge: parseFloat(row.transfer_surcharge || "0"), // <--- AGREGADO AQUÍ PARA LEER
      receiptDisclaimer: row.receipt_disclaimer,
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    };
  }

  // --- FUNCIÓN CLAVE QUE FALTABA: ENRICH ORDER ---
  // Busca el cliente, dispositivo y PAGOS para mostrar totales
  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);

    // Buscar pagos
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order.id);

    const payments = paymentsData ? paymentsData.map(this.mapPayment) : [];

    return {
      ...order,
      client: client!,
      device: device!,
      payments
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("username", username).single();
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase.from("users").insert(user).select().single();
    if (error) throw error;
    return data;
  }

  async getClients(userId: string): Promise<Client[]> {
    const { data } = await supabase.from("clients").select("*").eq("user_id", userId).order("name");
    return (data || []).map(this.mapClient);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    return data ? this.mapClient(data) : undefined;
  }

  async createClient(client: InsertClient & { userId: string }): Promise<Client> {
    const payload = {
      user_id: client.userId,
      name: client.name,
      dni: client.dni,
      address: client.address,
      phone: client.phone,
      email: client.email,
      who_picks_up: client.whoPicksUp,
      notes: client.notes
    };
    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    if (error) throw error;
    return this.mapClient(data);
  }

  async updateClient(id: string, update: Partial<InsertClient>): Promise<Client | undefined> {
    const payload: any = {};
    if (update.name !== undefined) payload.name = update.name;
    if (update.dni !== undefined) payload.dni = update.dni;
    if (update.address !== undefined) payload.address = update.address;
    if (update.phone !== undefined) payload.phone = update.phone;
    if (update.email !== undefined) payload.email = update.email;
    if (update.whoPicksUp !== undefined) payload.who_picks_up = update.whoPicksUp;
    if (update.notes !== undefined) payload.notes = update.notes;

    const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
    if (error) return undefined;
    return this.mapClient(data);
  }


  async getDevices(userId: string): Promise<Device[]> {
    const { data } = await supabase.from("devices").select("*").eq("user_id", userId);
    return (data || []).map(this.mapDevice);
  }

  async getDevicesByClient(clientId: string): Promise<Device[]> {
    const { data } = await supabase.from("devices").select("*").eq("client_id", clientId);
    return (data || []).map(this.mapDevice);
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const { data } = await supabase.from("devices").select("*").eq("id", id).single();
    return data ? this.mapDevice(data) : undefined;
  }

  async createDevice(device: InsertDevice & { userId: string }): Promise<Device> {
    const payload = {
      user_id: device.userId,
      client_id: device.clientId,
      brand: device.brand,
      model: device.model,
      imei: device.imei,
      serial_number: device.serialNumber,
      color: device.color,
      condition: device.condition,
      lock_type: device.lockType,
      lock_value: device.lockValue
    };
    const { data, error } = await supabase.from("devices").insert(payload).select().single();
    if (error) throw error;
    return this.mapDevice(data);
  }

  async updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device | undefined> {
    const { data: res } = await supabase.from("devices").update(data as any).eq("id", id).select().single();
    return res ? this.mapDevice(res) : undefined;
  }

  // --- GET ORDERS (Actualizado para usar enrichOrder) ---
  async getOrdersWithDetails(userId: string): Promise<RepairOrderWithDetails[]> {
    const { data } = await supabase
      .from("repair_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!data) return [];

    // Mapeamos y enriquecemos cada orden para tener los pagos
    return Promise.all(data.map(row => this.enrichOrder(this.mapOrder(row))));
  }

  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> {
    const { data } = await supabase
      .from("repair_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return undefined;

    // Usamos enrichOrder para asegurar que vengan los pagos
    return this.enrichOrder(this.mapOrder(data));
  }

  async createOrder(order: InsertRepairOrder & { userId: string }): Promise<RepairOrder> {
    const payload = {
      user_id: order.userId,
      client_id: order.clientId,
      device_id: order.deviceId,
      problem: order.problem,
      priority: order.priority,
      status: order.status,
      diagnosis: order.diagnosis,
      solution: order.solution,
      technician_name: order.technicianName,
      // CONVERSIÓN A STRING BLINDADA
      estimated_cost: String(order.estimatedCost || 0),
      final_cost: String(order.finalCost || 0),
      estimated_date: order.estimatedDate,
      intake_checklist: order.intakeChecklist || {},
      notes: order.notes
    };
    const { data, error } = await supabase.from("repair_orders").insert(payload).select().single();
    if (error) throw error;
    return this.mapOrder(data);
  }

  async updateOrder(id: string, order: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined> {
    const payload: any = {};
    if (order.status) payload.status = order.status;
    if (order.diagnosis) payload.diagnosis = order.diagnosis;
    if (order.solution) payload.solution = order.solution;
    if (order.technicianName) payload.technician_name = order.technicianName;
    if (order.problem) payload.problem = order.problem;

    // CONVERSIÓN A STRING BLINDADA
    if (order.finalCost !== undefined) payload.final_cost = String(order.finalCost);
    if (order.estimatedCost !== undefined) payload.estimated_cost = String(order.estimatedCost);

    if (order.completedAt) payload.completed_at = order.completedAt;
    if (order.deliveredAt) payload.delivered_at = order.deliveredAt;
    if (order.notes) payload.notes = order.notes;

    const { data, error } = await supabase.from("repair_orders").update(payload).eq("id", id).select().single();
    if (error) return undefined;
    return this.mapOrder(data);
  }

  async getPaymentsWithOrders(userId: string): Promise<(Payment & { order?: RepairOrder })[]> {
    const { data } = await supabase
      .from("payments")
      .select(`*, order:repair_orders(*)`)
      .eq("user_id", userId)
      .order("date", { ascending: false });

    return (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      orderId: p.order_id,
      amount: parseFloat(p.amount),
      method: p.method,
      date: new Date(p.date),
      notes: p.notes,
      items: p.cart_items,
      order: p.order ? this.mapOrder(p.order) : undefined
    }));
  }

  async createPayment(payment: InsertPayment & { userId: string, items: PaymentItem[] }): Promise<Payment> {
    // 1. Lógica de Descuento de Stock (Igual que antes)
    if (payment.items && payment.items.length > 0) {
      for (const item of payment.items) {
        if (item.type === 'product' && item.id) {
          const { data: prod } = await supabase.from("products").select("quantity").eq("id", item.id).single();
          if (prod) {
            const newQty = prod.quantity - item.quantity;
            await supabase.from("products").update({ quantity: newQty }).eq("id", item.id);
          }
        }
      }
    }

    // 2. NUEVA LÓGICA: Auto-detectar la Orden dentro del Carrito
    // Si no viene un orderId explícito, miramos si hay una reparación en los items.
    let targetOrderId = payment.orderId || null;

    // Si todavía es null, buscamos dentro del carrito
    if (!targetOrderId && payment.items && payment.items.length > 0) {
      const repairItem = payment.items.find((item: any) => item.type === 'repair' && item.id) as any;
      if (repairItem) {
        targetOrderId = repairItem.id!; // ¡Bingo! Encontramos la orden
      }
    }

    const payload = {
      user_id: payment.userId,
      order_id: targetOrderId, // Usamos el ID que encontramos (o null si era venta solo de productos)
      amount: payment.amount.toString(),
      method: payment.method,
      notes: payment.notes,
      cart_items: payment.items,
      date: new Date()
    };

    const { data, error } = await supabase.from("payments").insert(payload).select().single();
    if (error) throw error;
    return this.mapPayment(data);
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    const { data } = await supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false });
    return (data || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      category: e.category,
      description: e.description,
      amount: parseFloat(e.amount),
      date: new Date(e.date)
    }));
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const payload = {
      user_id: expense.userId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date
    };
    const { data, error } = await supabase.from("expenses").insert(payload).select().single();
    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      date: new Date(data.date)
    };
  }

  async getStats(userId: string): Promise<any> {
    const { data: orders } = await supabase.from("repair_orders").select("status, final_cost").eq("user_id", userId);
    const activeOrders = orders?.filter(o => ["recibido", "diagnostico", "en_curso"].includes(o.status)).length || 0;
    const pendingDiagnosis = orders?.filter(o => o.status === "recibido").length || 0;
    const readyPickup = orders?.filter(o => o.status === "listo").length || 0;

    const today = new Date().toISOString().split('T')[0];

    const { data: payments } = await supabase.from("payments").select("amount").eq("user_id", userId).gte("date", today);
    const dailyIncome = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    const { data: expenses } = await supabase.from("expenses").select("amount").eq("user_id", userId).gte("date", today);
    const dailyExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    return {
      activeOrders,
      pendingDiagnosis,
      readyPickup,
      dailyIncome,
      dailyExpenses,
      cashInBox: dailyIncome - dailyExpenses,
      netBalance: dailyIncome - dailyExpenses
    };
  }

  async getProducts(userId: string): Promise<Product[]> {
    const { data } = await supabase.from("products").select("*").eq("user_id", userId).order("name");
    return (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      description: p.description,
      sku: p.sku,
      quantity: p.quantity,
      price: parseFloat(p.price),
      cost: parseFloat(p.cost),
      category: p.category,
      lowStockThreshold: p.low_stock_threshold
    }));
  }

  async createProduct(product: InsertProduct & { userId: string }): Promise<Product> {
    const payload = {
      user_id: product.userId,
      name: product.name,
      description: product.description,
      sku: product.sku,
      quantity: product.quantity,
      price: product.price.toString(),
      cost: product.cost.toString(),
      category: product.category,
      low_stock_threshold: product.lowStockThreshold
    };
    const { data, error } = await supabase.from("products").insert(payload).select().single();
    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      sku: data.sku,
      quantity: data.quantity,
      price: parseFloat(data.price),
      cost: parseFloat(data.cost),
      category: data.category,
      lowStockThreshold: data.low_stock_threshold
    };
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const payload: any = {};
    if (product.name) payload.name = product.name;
    if (product.description) payload.description = product.description;
    if (product.sku) payload.sku = product.sku;
    if (product.quantity !== undefined) payload.quantity = product.quantity;
    if (product.price !== undefined) payload.price = product.price.toString();
    if (product.cost !== undefined) payload.cost = product.cost.toString();

    const { data, error } = await supabase.from("products").update(payload).eq("id", id).select().single();
    if (error) return undefined;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      sku: data.sku,
      quantity: data.quantity,
      price: parseFloat(data.price),
      cost: parseFloat(data.cost),
      category: data.category,
      lowStockThreshold: data.low_stock_threshold
    };
  }

  async deleteProduct(id: string, userId: string): Promise<void> {
    await supabase.from("products").delete().eq("id", id).eq("user_id", userId);
  }

  async getSettings(userId: string): Promise<Settings | undefined> {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return undefined;
    return this.mapSettings(data);
  }

  async updateSettings(userId: string, settings: InsertSettings): Promise<Settings> {
    const existing = await this.getSettings(userId);

    const payload = {
      user_id: userId,
      shop_name: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      whatsapp: settings.whatsapp,
      landline: settings.landline,
      logo_url: settings.logoUrl,
      card_surcharge: settings.cardSurcharge.toString(),
      transfer_surcharge: settings.transferSurcharge.toString(), // <--- AGREGADO AQUÍ PARA GUARDAR
      receipt_disclaimer: settings.receiptDisclaimer,
      updated_at: new Date()
    };

    let result;
    if (existing) {
      const { data } = await supabase
        .from("settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      result = data;
    } else {
      const { data } = await supabase
        .from("settings")
        .insert(payload)
        .select()
        .single();
      result = data;
    }

    if (!result) throw new Error("Failed to update settings");
    return this.mapSettings(result);
  }
}

export const storage = new SupabaseStorage();