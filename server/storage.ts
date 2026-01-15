import {
  type Client,
  type InsertClient,
  type Device,
  type InsertDevice,
  type RepairOrder,
  type InsertRepairOrder,
  type Payment,
  type InsertPayment,
  type RepairOrderWithDetails,
  type User,
  type InsertUser,
  type IntakeChecklist
} from "@shared/schema";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface IStorage {
  // Users (No se filtran por usuario, son globales para login)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients (Filtrados)
  getClients(currentUserId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;

  // Devices (Filtrados)
  getDevices(currentUserId: string): Promise<Device[]>;
  getDevicesByClient(clientId: string): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;

  // Orders (Filtrados)
  getOrders(currentUserId: string): Promise<RepairOrder[]>;
  getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]>;
  getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined>;
  getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]>;
  createOrder(order: InsertRepairOrder): Promise<RepairOrder>;
  updateOrder(id: string, order: Partial<RepairOrder>): Promise<RepairOrder | undefined>;

  // Payments (Filtrados)
  getPayments(currentUserId: string): Promise<Payment[]>;
  getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Stats (Filtrados)
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
  private readonly DEMO_USER_ID = "demo-user-id";

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.devices = new Map();
    this.orders = new Map();
    this.payments = new Map();
    this.seedData();
  }

  private seedData() {
    // Se mantiene igual que antes, omitido por brevedad pero 
    // en memoria ya tienen el userId asignado en el paso anterior.
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clients
  async getClients(currentUserId: string): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(c => c.userId === currentUserId || c.userId === this.DEMO_USER_ID);
  }
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { ...insertClient, id, userId: (insertClient as any).userId || this.DEMO_USER_ID, whoPicksUp: insertClient.whoPicksUp || "" };
    this.clients.set(id, client);
    return client;
  }
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    const updated = { ...client, ...updates };
    this.clients.set(id, updated);
    return updated;
  }

  // Devices
  async getDevices(currentUserId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.userId === currentUserId || d.userId === this.DEMO_USER_ID);
  }
  async getDevicesByClient(clientId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.clientId === clientId);
  }
  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = randomUUID();
    const device: Device = { ...insertDevice, id, userId: (insertDevice as any).userId || this.DEMO_USER_ID, lockType: insertDevice.lockType || "", lockValue: insertDevice.lockValue || "" };
    this.devices.set(id, device);
    return device;
  }

  // Orders
  async getOrders(currentUserId: string): Promise<RepairOrder[]> {
    return Array.from(this.orders.values())
      .filter(o => o.userId === currentUserId || o.userId === this.DEMO_USER_ID)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]> {
    const orders = await this.getOrders(currentUserId);
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }
  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    return this.enrichOrder(order);
  }
  async getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]> {
    const orders = Array.from(this.orders.values()).filter(o => o.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }
  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);
    const payments = await this.getPaymentsByOrder(order.id);
    return { ...order, client: client!, device: device!, payments };
  }
  async createOrder(insertOrder: InsertRepairOrder): Promise<RepairOrder> {
    const id = randomUUID();
    const order: RepairOrder = { ...insertOrder, id, userId: (insertOrder as any).userId || this.DEMO_USER_ID, createdAt: new Date().toISOString(), completedAt: null, deliveredAt: null, intakeChecklist: insertOrder.intakeChecklist || {} };
    this.orders.set(id, order);
    return order;
  }
  async updateOrder(id: string, updates: Partial<RepairOrder>): Promise<RepairOrder | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...updates };
    if (updates.status === "listo" && !order.completedAt) updated.completedAt = new Date().toISOString();
    if (updates.status === "entregado" && !order.deliveredAt) updated.deliveredAt = new Date().toISOString();
    this.orders.set(id, updated);
    return updated;
  }

  // Payments
  async getPayments(currentUserId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.userId === currentUserId || p.userId === this.DEMO_USER_ID)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments(currentUserId);
    return Promise.all(payments.map(async payment => {
      const order = await this.getOrderWithDetails(payment.orderId);
      return { ...payment, order };
    }));
  }
  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.orderId === orderId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = { ...insertPayment, id, userId: (insertPayment as any).userId || this.DEMO_USER_ID, date: new Date().toISOString() };
    this.payments.set(id, payment);
    return payment;
  }

  // Stats
  async getStats(currentUserId: string): Promise<{ activeOrders: number; pendingDiagnosis: number; readyForPickup: number; monthlyRevenue: number; }> {
    const orders = (await this.getOrders(currentUserId));
    const payments = (await this.getPayments(currentUserId));

    const activeOrders = orders.filter(o => o.status !== "entregado").length;
    const pendingDiagnosis = orders.filter(o => o.status === "recibido" || o.status === "diagnostico").length;
    const readyForPickup = orders.filter(o => o.status === "listo").length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyRevenue = payments
      .filter(p => { const d = new Date(p.date); return d >= monthStart && d <= monthEnd; })
      .reduce((sum, p) => sum + p.amount, 0);

    return { activeOrders, pendingDiagnosis, readyForPickup, monthlyRevenue };
  }
}

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  // Mappers (igual que antes)
  private mapUser(row: any): User { return { id: row.id, username: row.username }; }
  private mapClient(row: any): Client { return { id: row.id, userId: row.user_id, name: row.name, dni: row.dni, address: row.address, phone: row.phone, email: row.email, whoPicksUp: row.who_picks_up, notes: row.notes }; }
  private mapDevice(row: any): Device { return { id: row.id, userId: row.user_id, clientId: row.client_id, brand: row.brand, model: row.model, imei: row.imei, serialNumber: row.serial_number, color: row.color, condition: row.condition, lockType: row.lock_type, lockValue: row.lock_value }; }
  private mapOrder(row: any): RepairOrder { return { id: row.id, userId: row.user_id, clientId: row.client_id, deviceId: row.device_id, status: row.status, problem: row.problem, diagnosis: row.diagnosis, solution: row.solution, technicianName: row.technician_name, estimatedCost: Number(row.estimated_cost), finalCost: Number(row.final_cost), createdAt: row.created_at, estimatedDate: row.estimated_date, completedAt: row.completed_at, deliveredAt: row.delivered_at, priority: row.priority, notes: row.notes, intakeChecklist: row.intake_checklist || {} }; }
  private mapPayment(row: any): Payment { return { id: row.id, userId: row.user_id, orderId: row.order_id, amount: Number(row.amount), method: row.method, date: row.date, notes: row.notes }; }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const { data } = await this.client.from("users").select("*").eq("id", id).single();
    return data ? this.mapUser(data) : undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await this.client.from("users").select("*").eq("username", username).single();
    return data ? this.mapUser(data) : undefined;
  }
  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.client.from("users").insert(user).select().single();
    if (error) throw error;
    return this.mapUser(data);
  }

  // Clients
  async getClients(currentUserId: string): Promise<Client[]> {
    // FILTRO POR USUARIO APLICADO
    const { data, error } = await this.client.from("clients").select("*").eq("user_id", currentUserId);
    if (error) throw error;
    return data.map(this.mapClient);
  }
  async getClient(id: string): Promise<Client | undefined> {
    const { data, error } = await this.client.from("clients").select("*").eq("id", id).single();
    return (error || !data) ? undefined : this.mapClient(data);
  }
  async createClient(client: InsertClient): Promise<Client> {
    const dbClient = { user_id: (client as any).userId || (client as any).user_id, name: client.name, dni: client.dni, address: client.address, phone: client.phone, email: client.email, who_picks_up: client.whoPicksUp, notes: client.notes };
    const { data, error } = await this.client.from("clients").insert(dbClient).select().single();
    if (error) throw error;
    return this.mapClient(data);
  }
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.dni) dbUpdates.dni = updates.dni;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.whoPicksUp !== undefined) dbUpdates.who_picks_up = updates.whoPicksUp;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    const { data, error } = await this.client.from("clients").update(dbUpdates).eq("id", id).select().single();
    return (error || !data) ? undefined : this.mapClient(data);
  }

  // Devices
  async getDevices(currentUserId: string): Promise<Device[]> {
    // FILTRO POR USUARIO APLICADO
    const { data, error } = await this.client.from("devices").select("*").eq("user_id", currentUserId);
    if (error) throw error;
    return data.map(this.mapDevice);
  }
  async getDevicesByClient(clientId: string): Promise<Device[]> {
    const { data, error } = await this.client.from("devices").select("*").eq("client_id", clientId);
    if (error) throw error;
    return data.map(this.mapDevice);
  }
  async getDevice(id: string): Promise<Device | undefined> {
    const { data, error } = await this.client.from("devices").select("*").eq("id", id).single();
    return (error || !data) ? undefined : this.mapDevice(data);
  }
  async createDevice(device: InsertDevice): Promise<Device> {
    const dbDevice = { user_id: (device as any).userId || (device as any).user_id, client_id: device.clientId, brand: device.brand, model: device.model, imei: device.imei, serial_number: device.serialNumber, color: device.color, condition: device.condition, lock_type: device.lockType, lock_value: device.lockValue };
    const { data, error } = await this.client.from("devices").insert(dbDevice).select().single();
    if (error) throw error;
    return this.mapDevice(data);
  }

  // Orders
  async getOrders(currentUserId: string): Promise<RepairOrder[]> {
    // FILTRO POR USUARIO APLICADO
    const { data, error } = await this.client.from("repair_orders").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(this.mapOrder);
  }
  async getOrdersWithDetails(currentUserId: string): Promise<RepairOrderWithDetails[]> {
    const orders = await this.getOrders(currentUserId);
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }
  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> {
    const { data, error } = await this.client.from("repair_orders").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return this.enrichOrder(this.mapOrder(data));
  }
  async getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]> {
    const { data, error } = await this.client.from("repair_orders").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (error) throw error;
    const orders = data.map(this.mapOrder);
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }
  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);
    const payments = await this.getPaymentsByOrder(order.id);
    return { ...order, client: client!, device: device!, payments };
  }
  async createOrder(order: InsertRepairOrder): Promise<RepairOrder> {
    const dbOrder = { user_id: (order as any).userId || (order as any).user_id, client_id: order.clientId, device_id: order.deviceId, status: order.status, problem: order.problem, diagnosis: order.diagnosis, solution: order.solution, technician_name: order.technicianName, estimated_cost: order.estimatedCost, final_cost: order.finalCost, estimated_date: order.estimatedDate, priority: order.priority, notes: order.notes, intake_checklist: order.intakeChecklist };
    const { data, error } = await this.client.from("repair_orders").insert(dbOrder).select().single();
    if (error) throw error;
    return this.mapOrder(data);
  }
  async updateOrder(id: string, updates: Partial<RepairOrder>): Promise<RepairOrder | undefined> {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.problem) dbUpdates.problem = updates.problem;
    if (updates.diagnosis) dbUpdates.diagnosis = updates.diagnosis;
    if (updates.solution) dbUpdates.solution = updates.solution;
    if (updates.technicianName) dbUpdates.technician_name = updates.technicianName;
    if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
    if (updates.finalCost !== undefined) dbUpdates.final_cost = updates.finalCost;
    if (updates.estimatedDate) dbUpdates.estimated_date = updates.estimatedDate;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.notes) dbUpdates.notes = updates.notes;
    if (updates.status === "listo") dbUpdates.completed_at = new Date().toISOString();
    if (updates.status === "entregado") dbUpdates.delivered_at = new Date().toISOString();
    if (updates.intakeChecklist) dbUpdates.intake_checklist = updates.intakeChecklist;
    const { data, error } = await this.client.from("repair_orders").update(dbUpdates).eq("id", id).select().single();
    if (error || !data) return undefined;
    return this.mapOrder(data);
  }

  // Payments
  async getPayments(currentUserId: string): Promise<Payment[]> {
    // FILTRO POR USUARIO APLICADO
    const { data, error } = await this.client.from("payments").select("*").eq("user_id", currentUserId).order("date", { ascending: false });
    if (error) throw error;
    return data.map(this.mapPayment);
  }
  async getPaymentsWithOrders(currentUserId: string): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments(currentUserId);
    return Promise.all(payments.map(async payment => {
      const order = await this.getOrderWithDetails(payment.orderId);
      return { ...payment, order };
    }));
  }
  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    const { data, error } = await this.client.from("payments").select("*").eq("order_id", orderId).order("date", { ascending: false });
    if (error) throw error;
    return data.map(this.mapPayment);
  }
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const dbPayment = { user_id: (payment as any).userId || (payment as any).user_id, order_id: payment.orderId, amount: payment.amount, method: payment.method, notes: payment.notes };
    const { data, error } = await this.client.from("payments").insert(dbPayment).select().single();
    if (error) throw error;
    return this.mapPayment(data);
  }

  // Stats
  async getStats(currentUserId: string): Promise<{ activeOrders: number; pendingDiagnosis: number; readyForPickup: number; monthlyRevenue: number; }> {
    // FILTRO POR USUARIO APLICADO EN TODOS LOS CONTEOS

    // Active orders
    const { count: activeOrders } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true })
      .eq("user_id", currentUserId)
      .neq("status", "entregado");

    // Pending diagnosis
    const { count: pendingDiagnosis } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true })
      .eq("user_id", currentUserId)
      .in("status", ["recibido", "diagnostico"]);

    // Ready for pickup
    const { count: readyForPickup } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true })
      .eq("user_id", currentUserId)
      .eq("status", "listo");

    // Monthly Revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { data: payments } = await this.client.from("payments").select("amount")
      .eq("user_id", currentUserId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const monthlyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return {
      activeOrders: activeOrders || 0,
      pendingDiagnosis: pendingDiagnosis || 0,
      readyForPickup: readyForPickup || 0,
      monthlyRevenue,
    };
  }
}

// Logic to switch storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const storage = (supabaseUrl && supabaseKey)
  ? new SupabaseStorage(supabaseUrl, supabaseKey)
  : new MemStorage();