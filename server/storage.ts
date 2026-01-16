import {
  type Client, type InsertClient,
  type Device, type InsertDevice,
  type RepairOrder, type InsertRepairOrder,
  type Payment, type InsertPayment,
  type RepairOrderWithDetails,
  type User, type InsertUser,
  type BusinessSettings, type InsertSettings,
  type Product, type InsertProduct
} from "@shared/schema";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(currentUserId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;

  // Devices
  getDevices(currentUserId: string): Promise<Device[]>;
  getDevicesByClient(clientId: string): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;

  // Orders
  getOrders(currentUserId: string): Promise<RepairOrder[]>;
  getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]>;
  getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined>;
  getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]>;
  createOrder(order: InsertRepairOrder): Promise<RepairOrder>;
  updateOrder(id: string, order: Partial<RepairOrder>): Promise<RepairOrder | undefined>;

  // Payments
  getPayments(currentUserId: string): Promise<Payment[]>;
  getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Settings
  getSettings(currentUserId: string): Promise<BusinessSettings | undefined>;
  updateSettings(currentUserId: string, settings: InsertSettings): Promise<BusinessSettings>;

  // Products
  getProducts(currentUserId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;

  // Stats
  getStats(currentUserId: string): Promise<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    monthlyRevenue: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private devices: Map<string, Device>;
  private orders: Map<string, RepairOrder>;
  private payments: Map<string, Payment>;
  private settings: Map<string, BusinessSettings>;
  private products: Map<string, Product>;
  private readonly DEMO_USER_ID = "demo-user-id";

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.devices = new Map();
    this.orders = new Map();
    this.payments = new Map();
    this.settings = new Map();
    this.products = new Map();
    this.seedData();
  }

  private seedData() { }

  async getUser(id: string): Promise<User | undefined> { return this.users.get(id); }
  async getUserByUsername(username: string): Promise<User | undefined> { return Array.from(this.users.values()).find((u) => u.username === username); }
  async createUser(insertUser: InsertUser): Promise<User> { const id = randomUUID(); const user: User = { ...insertUser, id }; this.users.set(id, user); return user; }

  async getClients(currentUserId: string): Promise<Client[]> { return Array.from(this.clients.values()).filter(c => c.userId === currentUserId || c.userId === this.DEMO_USER_ID); }
  async getClient(id: string): Promise<Client | undefined> { return this.clients.get(id); }
  async createClient(client: InsertClient): Promise<Client> { const id = randomUUID(); const newClient: Client = { ...client, id, userId: (client as any).userId || this.DEMO_USER_ID, whoPicksUp: client.whoPicksUp || "" }; this.clients.set(id, newClient); return newClient; }
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> { const client = this.clients.get(id); if (!client) return undefined; const updated = { ...client, ...updates }; this.clients.set(id, updated); return updated; }

  async getDevices(currentUserId: string): Promise<Device[]> { return Array.from(this.devices.values()).filter(d => d.userId === currentUserId || d.userId === this.DEMO_USER_ID); }
  async getDevicesByClient(clientId: string): Promise<Device[]> { return Array.from(this.devices.values()).filter(d => d.clientId === clientId); }
  async getDevice(id: string): Promise<Device | undefined> { return this.devices.get(id); }
  async createDevice(device: InsertDevice): Promise<Device> { const id = randomUUID(); const newDevice: Device = { ...device, id, userId: (device as any).userId || this.DEMO_USER_ID, lockType: device.lockType || "", lockValue: device.lockValue || "" }; this.devices.set(id, newDevice); return newDevice; }

  async getOrders(currentUserId: string): Promise<RepairOrder[]> { return Array.from(this.orders.values()).filter(o => o.userId === currentUserId || o.userId === this.DEMO_USER_ID).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]> { const orders = await this.getOrders(currentUserId); return Promise.all(orders.map(order => this.enrichOrder(order))); }
  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> { const order = this.orders.get(id); if (!order) return undefined; return this.enrichOrder(order); }
  async getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]> { const orders = Array.from(this.orders.values()).filter(o => o.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); return Promise.all(orders.map(order => this.enrichOrder(order))); }

  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);
    const payments = Array.from(this.payments.values()).filter(p => p.orderId === order.id);
    return { ...order, client: client!, device: device!, payments };
  }

  async createOrder(insertOrder: InsertRepairOrder): Promise<RepairOrder> { const id = randomUUID(); const order: RepairOrder = { ...insertOrder, id, userId: (insertOrder as any).userId || this.DEMO_USER_ID, createdAt: new Date().toISOString(), completedAt: null, deliveredAt: null, intakeChecklist: insertOrder.intakeChecklist || {} }; this.orders.set(id, order); return order; }
  async updateOrder(id: string, updates: Partial<RepairOrder>): Promise<RepairOrder | undefined> { const order = this.orders.get(id); if (!order) return undefined; const updated = { ...order, ...updates }; if (updates.status === "listo" && !order.completedAt) updated.completedAt = new Date().toISOString(); if (updates.status === "entregado" && !order.deliveredAt) updated.deliveredAt = new Date().toISOString(); this.orders.set(id, updated); return updated; }

  async getPayments(currentUserId: string): Promise<Payment[]> { return Array.from(this.payments.values()).filter(p => p.userId === currentUserId || p.userId === this.DEMO_USER_ID).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }
  async getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments(currentUserId);
    return Promise.all(payments.map(async payment => {
      if (!payment.orderId) return { ...payment, order: undefined };
      const order = await this.getOrderWithDetails(payment.orderId);
      return { ...payment, order };
    }));
  }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> { const id = randomUUID(); const payment: Payment = { ...insertPayment, id, orderId: insertPayment.orderId || null, userId: (insertPayment as any).userId || this.DEMO_USER_ID, date: new Date().toISOString() }; this.payments.set(id, payment); return payment; }

  async getSettings(currentUserId: string): Promise<BusinessSettings | undefined> { return Array.from(this.settings.values()).find(s => s.userId === currentUserId || s.userId === this.DEMO_USER_ID); }
  async updateSettings(currentUserId: string, settings: InsertSettings): Promise<BusinessSettings> { const existing = await this.getSettings(currentUserId); const id = existing?.id || randomUUID(); const newSettings: BusinessSettings = { ...settings, id, userId: currentUserId, website: settings.website || "", taxId: settings.taxId || "", logoUrl: settings.logoUrl || "", termsAndConditions: settings.termsAndConditions || "" }; this.settings.set(id, newSettings); return newSettings; }

  async getProducts(currentUserId: string): Promise<Product[]> { return Array.from(this.products.values()).filter(p => p.userId === currentUserId || p.userId === this.DEMO_USER_ID); }
  async getProduct(id: string): Promise<Product | undefined> { return this.products.get(id); }
  async createProduct(product: InsertProduct): Promise<Product> { const id = randomUUID(); const newProduct: Product = { ...product, id, userId: (product as any).userId || this.DEMO_USER_ID }; this.products.set(id, newProduct); return newProduct; }
  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> { const existing = this.products.get(id); if (!existing) return undefined; const updated = { ...existing, ...product }; this.products.set(id, updated); return updated; }

  async getStats(currentUserId: string): Promise<{ activeOrders: number; pendingDiagnosis: number; readyForPickup: number; monthlyRevenue: number; }> {
    const orders = (await this.getOrders(currentUserId));
    const payments = (await this.getPayments(currentUserId));
    const activeOrders = orders.filter(o => o.status !== "entregado").length;
    const pendingDiagnosis = orders.filter(o => o.status === "recibido" || o.status === "diagnostico").length;
    const readyForPickup = orders.filter(o => o.status === "listo").length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyRevenue = payments.filter(p => { const d = new Date(p.date); return d >= monthStart && d <= monthEnd; }).reduce((sum, p) => sum + p.amount, 0);
    return { activeOrders, pendingDiagnosis, readyForPickup, monthlyRevenue };
  }
}

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  private mapUser(row: any): User { return { id: row.id, username: row.username }; }
  private mapClient(row: any): Client { return { id: row.id, userId: row.user_id, name: row.name, dni: row.dni, address: row.address, phone: row.phone, email: row.email, whoPicksUp: row.who_picks_up, notes: row.notes }; }
  private mapDevice(row: any): Device { return { id: row.id, userId: row.user_id, clientId: row.client_id, brand: row.brand, model: row.model, imei: row.imei, serialNumber: row.serial_number, color: row.color, condition: row.condition, lockType: row.lock_type, lockValue: row.lock_value }; }
  private mapOrder(row: any): RepairOrder { return { id: row.id, userId: row.user_id, clientId: row.client_id, deviceId: row.device_id, status: row.status, problem: row.problem, diagnosis: row.diagnosis, solution: row.solution, technicianName: row.technician_name, estimatedCost: Number(row.estimated_cost), finalCost: Number(row.final_cost), createdAt: row.created_at, estimatedDate: row.estimated_date, completedAt: row.completed_at, deliveredAt: row.delivered_at, priority: row.priority, notes: row.notes, intakeChecklist: row.intake_checklist || {} }; }
  private mapPayment(row: any): Payment { return { id: row.id, userId: row.user_id, orderId: row.order_id, amount: Number(row.amount), method: row.method, date: row.date, notes: row.notes }; }
  private mapSettings(row: any): BusinessSettings { return { id: row.id, userId: row.user_id, businessName: row.business_name, address: row.address, phone: row.phone, email: row.email, website: row.website, taxId: row.tax_id, logoUrl: row.logo_url, termsAndConditions: row.terms_and_conditions }; }
  private mapProduct(row: any): Product { return { id: row.id, userId: row.user_id, name: row.name, description: row.description, sku: row.sku, quantity: row.quantity, price: Number(row.price), cost: Number(row.cost), category: row.category, lowStockThreshold: row.low_stock_threshold }; }

  async getUser(id: string): Promise<User | undefined> { const { data } = await this.client.from("users").select("*").eq("id", id).single(); return data ? this.mapUser(data) : undefined; }
  async getUserByUsername(username: string): Promise<User | undefined> { const { data } = await this.client.from("users").select("*").eq("username", username).single(); return data ? this.mapUser(data) : undefined; }
  async createUser(user: InsertUser): Promise<User> { const { data, error } = await this.client.from("users").insert(user).select().single(); if (error) throw error; return this.mapUser(data); }

  async getClients(currentUserId: string): Promise<Client[]> { const { data, error } = await this.client.from("clients").select("*").eq("user_id", currentUserId); if (error) throw error; return data.map(this.mapClient); }
  async getClient(id: string): Promise<Client | undefined> { const { data, error } = await this.client.from("clients").select("*").eq("id", id).single(); return (error || !data) ? undefined : this.mapClient(data); }
  async createClient(client: InsertClient): Promise<Client> { const dbClient = { user_id: (client as any).userId || (client as any).user_id, name: client.name, dni: client.dni, address: client.address, phone: client.phone, email: client.email, who_picks_up: client.whoPicksUp, notes: client.notes }; const { data, error } = await this.client.from("clients").insert(dbClient).select().single(); if (error) throw error; return this.mapClient(data); }
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> { const dbUpdates: any = {}; if (updates.name) dbUpdates.name = updates.name; if (updates.dni) dbUpdates.dni = updates.dni; if (updates.address) dbUpdates.address = updates.address; if (updates.phone) dbUpdates.phone = updates.phone; if (updates.email !== undefined) dbUpdates.email = updates.email; if (updates.whoPicksUp !== undefined) dbUpdates.who_picks_up = updates.whoPicksUp; if (updates.notes !== undefined) dbUpdates.notes = updates.notes; const { data, error } = await this.client.from("clients").update(dbUpdates).eq("id", id).select().single(); return (error || !data) ? undefined : this.mapClient(data); }

  async getDevices(currentUserId: string): Promise<Device[]> { const { data, error } = await this.client.from("devices").select("*").eq("user_id", currentUserId); if (error) throw error; return data.map(this.mapDevice); }
  async getDevicesByClient(clientId: string): Promise<Device[]> { const { data, error } = await this.client.from("devices").select("*").eq("client_id", clientId); if (error) throw error; return data.map(this.mapDevice); }
  async getDevice(id: string): Promise<Device | undefined> { const { data, error } = await this.client.from("devices").select("*").eq("id", id).single(); return (error || !data) ? undefined : this.mapDevice(data); }
  async createDevice(device: InsertDevice): Promise<Device> { const dbDevice = { user_id: (device as any).userId || (device as any).user_id, client_id: device.clientId, brand: device.brand, model: device.model, imei: device.imei, serial_number: device.serialNumber, color: device.color, condition: device.condition, lock_type: device.lockType, lock_value: device.lockValue }; const { data, error } = await this.client.from("devices").insert(dbDevice).select().single(); if (error) throw error; return this.mapDevice(data); }

  async getOrders(currentUserId: string): Promise<RepairOrder[]> { const { data, error } = await this.client.from("repair_orders").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false }); if (error) throw error; return data.map(this.mapOrder); }
  async getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]> { const orders = await this.getOrders(currentUserId); return Promise.all(orders.map(order => this.enrichOrder(order))); }
  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> { const { data, error } = await this.client.from("repair_orders").select("*").eq("id", id).single(); if (error || !data) return undefined; return this.enrichOrder(this.mapOrder(data)); }
  async getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]> { const { data, error } = await this.client.from("repair_orders").select("*").eq("client_id", clientId).order("created_at", { ascending: false }); if (error) throw error; const orders = data.map(this.mapOrder); return Promise.all(orders.map(order => this.enrichOrder(order))); }

  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);
    const { data: paymentsData } = await this.client.from("payments").select("*").eq("order_id", order.id);
    const payments = paymentsData ? paymentsData.map(this.mapPayment) : [];
    return { ...order, client: client!, device: device!, payments };
  }

  async createOrder(order: InsertRepairOrder): Promise<RepairOrder> { const dbOrder = { user_id: (order as any).userId || (order as any).user_id, client_id: order.clientId, device_id: order.deviceId, status: order.status, problem: order.problem, diagnosis: order.diagnosis, solution: order.solution, technician_name: order.technicianName, estimated_cost: order.estimatedCost, final_cost: order.finalCost, estimated_date: order.estimatedDate, priority: order.priority, notes: order.notes, intake_checklist: order.intakeChecklist }; const { data, error } = await this.client.from("repair_orders").insert(dbOrder).select().single(); if (error) throw error; return this.mapOrder(data); }
  async updateOrder(id: string, updates: Partial<RepairOrder>): Promise<RepairOrder | undefined> { const dbUpdates: any = {}; if (updates.status) dbUpdates.status = updates.status; if (updates.problem) dbUpdates.problem = updates.problem; if (updates.diagnosis) dbUpdates.diagnosis = updates.diagnosis; if (updates.solution) dbUpdates.solution = updates.solution; if (updates.technicianName) dbUpdates.technician_name = updates.technicianName; if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost; if (updates.finalCost !== undefined) dbUpdates.final_cost = updates.finalCost; if (updates.estimatedDate) dbUpdates.estimated_date = updates.estimatedDate; if (updates.priority) dbUpdates.priority = updates.priority; if (updates.notes) dbUpdates.notes = updates.notes; if (updates.status === "listo") dbUpdates.completed_at = new Date().toISOString(); if (updates.status === "entregado") dbUpdates.delivered_at = new Date().toISOString(); if (updates.intakeChecklist) dbUpdates.intake_checklist = updates.intakeChecklist; const { data, error } = await this.client.from("repair_orders").update(dbUpdates).eq("id", id).select().single(); if (error || !data) return undefined; return this.mapOrder(data); }

  async getPayments(currentUserId: string): Promise<Payment[]> {
    const { data, error } = await this.client.from("payments").select("*").eq("user_id", currentUserId).order("date", { ascending: false });
    if (error) throw error;
    return data.map(this.mapPayment);
  }
  async getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments(currentUserId);
    return Promise.all(payments.map(async payment => {
      if (!payment.orderId) return { ...payment, order: undefined };
      const order = await this.getOrderWithDetails(payment.orderId);
      return { ...payment, order };
    }));
  }
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const dbPayment = { user_id: (payment as any).userId || (payment as any).user_id, order_id: payment.orderId || null, amount: payment.amount, method: payment.method, notes: payment.notes };
    const { data, error } = await this.client.from("payments").insert(dbPayment).select().single();
    if (error) throw error;
    return this.mapPayment(data);
  }

  async getSettings(currentUserId: string): Promise<BusinessSettings | undefined> {
    const { data, error } = await this.client.from("business_settings").select("*").eq("user_id", currentUserId).single();
    if (error || !data) return undefined;
    return this.mapSettings(data);
  }
  async updateSettings(currentUserId: string, settings: InsertSettings): Promise<BusinessSettings> {
    const dbSettings = { user_id: currentUserId, business_name: settings.businessName, address: settings.address, phone: settings.phone, email: settings.email, website: settings.website, tax_id: settings.taxId, logo_url: settings.logoUrl, terms_and_conditions: settings.termsAndConditions };
    const { data, error } = await this.client.from("business_settings").upsert(dbSettings, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return this.mapSettings(data);
  }

  async getProducts(currentUserId: string): Promise<Product[]> {
    const { data, error } = await this.client.from("products").select("*").eq("user_id", currentUserId);
    if (error) throw error;
    return data.map(this.mapProduct);
  }
  async getProduct(id: string): Promise<Product | undefined> {
    const { data, error } = await this.client.from("products").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return this.mapProduct(data);
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const dbProduct = { user_id: (product as any).userId || (product as any).user_id, name: product.name, description: product.description, sku: product.sku, quantity: product.quantity, price: product.price, cost: product.cost, category: product.category, low_stock_threshold: product.lowStockThreshold };
    const { data, error } = await this.client.from("products").insert(dbProduct).select().single();
    if (error) throw error;
    return this.mapProduct(data);
  }
  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const dbUpdates: any = {};
    if (product.name) dbUpdates.name = product.name;
    if (product.description !== undefined) dbUpdates.description = product.description;
    if (product.sku !== undefined) dbUpdates.sku = product.sku;
    if (product.quantity !== undefined) dbUpdates.quantity = product.quantity;
    if (product.price !== undefined) dbUpdates.price = product.price;
    if (product.cost !== undefined) dbUpdates.cost = product.cost;
    if (product.category !== undefined) dbUpdates.category = product.category;
    if (product.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = product.lowStockThreshold;
    const { data, error } = await this.client.from("products").update(dbUpdates).eq("id", id).select().single();
    if (error || !data) return undefined;
    return this.mapProduct(data);
  }

  async getStats(currentUserId: string): Promise<{ activeOrders: number; pendingDiagnosis: number; readyForPickup: number; monthlyRevenue: number; }> {
    const { count: activeOrders } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).eq("user_id", currentUserId).neq("status", "entregado");
    const { count: pendingDiagnosis } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).eq("user_id", currentUserId).in("status", ["recibido", "diagnostico"]);
    const { count: readyForPickup } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).eq("user_id", currentUserId).eq("status", "listo");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const { data: payments } = await this.client.from("payments").select("amount").eq("user_id", currentUserId).gte("date", monthStart).lte("date", monthEnd);
    const monthlyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    return { activeOrders: activeOrders || 0, pendingDiagnosis: pendingDiagnosis || 0, readyForPickup: readyForPickup || 0, monthlyRevenue };
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const storage = (supabaseUrl && supabaseKey) ? new SupabaseStorage(supabaseUrl, supabaseKey) : new MemStorage();