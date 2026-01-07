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
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;

  // Devices
  getDevices(): Promise<Device[]>;
  getDevicesByClient(clientId: string): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;

  // Orders
  getOrders(): Promise<RepairOrder[]>;
  getOrdersWithDetails(): Promise<RepairOrderWithDetails[]>;
  getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined>;
  getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]>;
  createOrder(order: InsertRepairOrder): Promise<RepairOrder>;
  updateOrder(id: string, order: Partial<RepairOrder>): Promise<RepairOrder | undefined>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsWithOrders(): Promise<(Payment & { order?: RepairOrderWithDetails })[]>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Stats
  getStats(): Promise<{
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

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.devices = new Map();
    this.orders = new Map();
    this.payments = new Map();

    // Add sample data
    this.seedData();
  }

  private seedData() {
    // Sample clients
    const client1: Client = {
      id: "client-1",
      name: "María García",
      dni: "12345678",
      phone: "+54 11 5555-1234",
      email: "maria.garcia@email.com",
      address: "Av. Corrientes 1234, CABA",
      whoPicksUp: "",
      notes: "Cliente frecuente",
    };
    const client2: Client = {
      id: "client-2",
      name: "Juan Pérez",
      dni: "87654321",
      phone: "+54 11 5555-5678",
      email: "juan.perez@email.com",
      address: "Calle Florida 567, CABA",
      whoPicksUp: "",
      notes: "",
    };
    const client3: Client = {
      id: "client-3",
      name: "Ana López",
      dni: "11223344",
      phone: "+54 11 5555-9012",
      email: "",
      address: "",
      whoPicksUp: "Esposo",
      notes: "Prefiere contacto por WhatsApp",
    };
    this.clients.set(client1.id, client1);
    this.clients.set(client2.id, client2);
    this.clients.set(client3.id, client3);

    // Sample devices
    const device1: Device = {
      id: "device-1",
      clientId: "client-1",
      brand: "Samsung",
      model: "Galaxy S21",
      imei: "354678901234567",
      serialNumber: "R5CR30ABCDE",
      color: "Negro",
      condition: "Bueno",
      lockType: "PIN",
      lockValue: "1234",
    };
    const device2: Device = {
      id: "device-2",
      clientId: "client-1",
      brand: "Apple",
      model: "iPhone 13",
      imei: "356789012345678",
      serialNumber: "F17YJABCDEF",
      color: "Blanco",
      condition: "Excelente",
      lockType: "PASSWORD",
      lockValue: "",
    };
    const device3: Device = {
      id: "device-3",
      clientId: "client-2",
      brand: "Xiaomi",
      model: "Redmi Note 11",
      imei: "358901234567890",
      serialNumber: "XM123456789",
      color: "Azul",
      condition: "Regular",
      lockType: "",
      lockValue: "",
    };
    const device4: Device = {
      id: "device-4",
      clientId: "client-3",
      brand: "Motorola",
      model: "Moto G52",
      imei: "359012345678901",
      serialNumber: "ZY3245ABCD",
      color: "Verde",
      condition: "Bueno",
      lockType: "",
      lockValue: "",
    };
    this.devices.set(device1.id, device1);
    this.devices.set(device2.id, device2);
    this.devices.set(device3.id, device3);
    this.devices.set(device4.id, device4);

    // Sample orders
    const now = new Date();
    const order1: RepairOrder = {
      id: "order-1",
      clientId: "client-1",
      deviceId: "device-1",
      status: "en_curso",
      problem: "Pantalla rota, no responde al tacto",
      diagnosis: "Display dañado, requiere reemplazo completo",
      solution: "",
      technicianName: "Carlos Técnico",
      estimatedCost: 15000,
      finalCost: 0,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      deliveredAt: null,
      priority: "normal",
      notes: "Cliente solicita presupuesto antes de proceder",
      intakeChecklist: {},
    };
    const order2: RepairOrder = {
      id: "order-2",
      clientId: "client-2",
      deviceId: "device-3",
      status: "diagnostico",
      problem: "El teléfono no enciende",
      diagnosis: "",
      solution: "",
      technicianName: "Mario Técnico",
      estimatedCost: 0,
      finalCost: 0,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      deliveredAt: null,
      priority: "urgente",
      notes: "",
      intakeChecklist: {},
    };
    const order3: RepairOrder = {
      id: "order-3",
      clientId: "client-3",
      deviceId: "device-4",
      status: "listo",
      problem: "Batería se descarga muy rápido",
      diagnosis: "Batería degradada al 65%",
      solution: "Reemplazo de batería original",
      technicianName: "Carlos Técnico",
      estimatedCost: 8000,
      finalCost: 8500,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: null,
      priority: "normal",
      notes: "Listo para entregar, avisar al cliente",
      intakeChecklist: { charges: "yes", powersOn: "unknown" },
    };
    const order4: RepairOrder = {
      id: "order-4",
      clientId: "client-1",
      deviceId: "device-2",
      status: "recibido",
      problem: "Cámara trasera no enfoca correctamente",
      diagnosis: "",
      solution: "",
      technicianName: "",
      estimatedCost: 12000,
      finalCost: 0,
      createdAt: now.toISOString(),
      estimatedDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      deliveredAt: null,
      priority: "normal",
      notes: "",
      intakeChecklist: {},
    };
    this.orders.set(order1.id, order1);
    this.orders.set(order2.id, order2);
    this.orders.set(order3.id, order3);
    this.orders.set(order4.id, order4);

    // Sample payments
    const payment1: Payment = {
      id: "payment-1",
      orderId: "order-3",
      amount: 4000,
      method: "efectivo",
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Seña",
    };
    const payment2: Payment = {
      id: "payment-2",
      orderId: "order-1",
      amount: 7500,
      method: "transferencia",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Adelanto 50%",
    };
    this.payments.set(payment1.id, payment1);
    this.payments.set(payment2.id, payment2);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      ...insertClient,
      id,
      whoPicksUp: insertClient.whoPicksUp || ""
    };
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
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevicesByClient(clientId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.clientId === clientId);
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = randomUUID();
    const device: Device = {
      ...insertDevice,
      id,
      lockType: insertDevice.lockType || "",
      lockValue: insertDevice.lockValue || "",
    };
    this.devices.set(id, device);
    return device;
  }

  // Orders
  async getOrders(): Promise<RepairOrder[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrdersWithDetails(): Promise<RepairOrderWithDetails[]> {
    const orders = await this.getOrders();
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }

  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    return this.enrichOrder(order);
  }

  async getOrdersByClient(clientId: string): Promise<RepairOrderWithDetails[]> {
    const orders = Array.from(this.orders.values())
      .filter(o => o.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }

  private async enrichOrder(order: RepairOrder): Promise<RepairOrderWithDetails> {
    const client = await this.getClient(order.clientId);
    const device = await this.getDevice(order.deviceId);
    const payments = await this.getPaymentsByOrder(order.id);
    return {
      ...order,
      client: client!,
      device: device!,
      payments,
    };
  }

  async createOrder(insertOrder: InsertRepairOrder): Promise<RepairOrder> {
    const id = randomUUID();
    const order: RepairOrder = {
      ...insertOrder,
      id,
      createdAt: new Date().toISOString(),
      completedAt: null,
      deliveredAt: null,
      intakeChecklist: insertOrder.intakeChecklist || {},
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<RepairOrder>): Promise<RepairOrder | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated = { ...order, ...updates };

    // Auto-set completedAt when status changes to listo
    if (updates.status === "listo" && !order.completedAt) {
      updated.completedAt = new Date().toISOString();
    }

    // Auto-set deliveredAt when status changes to entregado
    if (updates.status === "entregado" && !order.deliveredAt) {
      updated.deliveredAt = new Date().toISOString();
    }

    this.orders.set(id, updated);
    return updated;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getPaymentsWithOrders(): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments();
    return Promise.all(payments.map(async payment => {
      const order = await this.getOrderWithDetails(payment.orderId);
      return { ...payment, order };
    }));
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.orderId === orderId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      ...insertPayment,
      id,
      date: new Date().toISOString(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  // Stats
  async getStats(): Promise<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    monthlyRevenue: number;
  }> {
    const orders = Array.from(this.orders.values());
    const payments = Array.from(this.payments.values());

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const activeOrders = orders.filter(o =>
      o.status !== "entregado"
    ).length;

    const pendingDiagnosis = orders.filter(o =>
      o.status === "recibido" || o.status === "diagnostico"
    ).length;

    const readyForPickup = orders.filter(o =>
      o.status === "listo"
    ).length;

    // Calculate monthly revenue from payments within current month only
    const monthlyRevenue = payments
      .filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      activeOrders,
      pendingDiagnosis,
      readyForPickup,
      monthlyRevenue,
    };
  }
}

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  // Helpers to map snake_case DB to camelCase keys
  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
    };
  }

  private mapClient(row: any): Client {
    return {
      id: row.id,
      name: row.name,
      dni: row.dni,
      address: row.address,
      phone: row.phone,
      email: row.email,
      whoPicksUp: row.who_picks_up,
      notes: row.notes,
    };
  }

  private mapDevice(row: any): Device {
    return {
      id: row.id,
      clientId: row.client_id,
      brand: row.brand,
      model: row.model,
      imei: row.imei,
      serialNumber: row.serial_number,
      color: row.color,
      condition: row.condition,
      lockType: row.lock_type,
      lockValue: row.lock_value,
    };
  }

  private mapOrder(row: any): RepairOrder {
    return {
      id: row.id,
      clientId: row.client_id,
      deviceId: row.device_id,
      status: row.status,
      problem: row.problem,
      diagnosis: row.diagnosis,
      solution: row.solution,
      technicianName: row.technician_name,
      estimatedCost: Number(row.estimated_cost),
      finalCost: Number(row.final_cost),
      createdAt: row.created_at,
      estimatedDate: row.estimated_date,
      completedAt: row.completed_at,
      deliveredAt: row.delivered_at,
      priority: row.priority,
      notes: row.notes,
      intakeChecklist: row.intake_checklist || {},
    };
  }

  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      amount: Number(row.amount),
      method: row.method,
      date: row.date,
      notes: row.notes,
    };
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await this.client.from("users").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return this.mapUser(data);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.client.from("users").select("*").eq("username", username).single();
    if (error || !data) return undefined;
    return this.mapUser(data);
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.client.from("users").insert(user).select().single();
    if (error) throw error;
    return this.mapUser(data);
  }

  // Clients
  async getClients(): Promise<Client[]> {
    const { data, error } = await this.client.from("clients").select("*");
    if (error) throw error;
    return data.map(this.mapClient);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const { data, error } = await this.client.from("clients").select("*").eq("id", id).single();
    if (error) return undefined;
    return this.mapClient(data);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const dbClient = {
      name: client.name,
      dni: client.dni,
      address: client.address,
      phone: client.phone,
      email: client.email,
      who_picks_up: client.whoPicksUp,
      notes: client.notes,
    };
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
    if (error) return undefined;
    if (!data) return undefined; // Should satisfy the undefined return type
    return this.mapClient(data);
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    const { data, error } = await this.client.from("devices").select("*");
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
    if (error) return undefined;
    return this.mapDevice(data);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const dbDevice = {
      client_id: device.clientId,
      brand: device.brand,
      model: device.model,
      imei: device.imei,
      serial_number: device.serialNumber,
      color: device.color,
      condition: device.condition,
      lock_type: device.lockType,
      lock_value: device.lockValue,
    };
    const { data, error } = await this.client.from("devices").insert(dbDevice).select().single();
    if (error) throw error;
    return this.mapDevice(data);
  }

  // Orders
  async getOrders(): Promise<RepairOrder[]> {
    const { data, error } = await this.client.from("repair_orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(this.mapOrder);
  }

  async getOrdersWithDetails(): Promise<RepairOrderWithDetails[]> {
    const orders = await this.getOrders();
    return Promise.all(orders.map(order => this.enrichOrder(order)));
  }

  async getOrderWithDetails(id: string): Promise<RepairOrderWithDetails | undefined> {
    const { data, error } = await this.client.from("repair_orders").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    const order = this.mapOrder(data);
    return this.enrichOrder(order);
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
    return {
      ...order,
      client: client!,
      device: device!,
      payments,
    };
  }

  async createOrder(order: InsertRepairOrder): Promise<RepairOrder> {
    const dbOrder = {
      client_id: order.clientId,
      device_id: order.deviceId,
      status: order.status,
      problem: order.problem,
      diagnosis: order.diagnosis,
      solution: order.solution,
      technician_name: order.technicianName,
      estimated_cost: order.estimatedCost,
      final_cost: order.finalCost,
      estimated_date: order.estimatedDate,
      priority: order.priority,
      notes: order.notes,
      intake_checklist: order.intakeChecklist,
    };
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
    // Handle status changes for automatic timestamps
    if (updates.status === "listo") {
      dbUpdates.completed_at = new Date().toISOString();
    }
    if (updates.status === "entregado") {
      dbUpdates.delivered_at = new Date().toISOString();
    }

    // Also support checklist updates if needed, though mostly read-only after creation
    if (updates.intakeChecklist) dbUpdates.intake_checklist = updates.intakeChecklist;

    const { data, error } = await this.client.from("repair_orders").update(dbUpdates).eq("id", id).select().single();
    if (error || !data) return undefined;
    return this.mapOrder(data);
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    const { data, error } = await this.client.from("payments").select("*").order("date", { ascending: false });
    if (error) throw error;
    return data.map(this.mapPayment);
  }

  async getPaymentsWithOrders(): Promise<(Payment & { order?: RepairOrderWithDetails })[]> {
    const payments = await this.getPayments();
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
    const dbPayment = {
      order_id: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      notes: payment.notes,
    };
    const { data, error } = await this.client.from("payments").insert(dbPayment).select().single();
    if (error) throw error;
    return this.mapPayment(data);
  }

  // Stats
  async getStats(): Promise<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    monthlyRevenue: number;
  }> {
    // This is expensive if we just fetch all. Ideally we use count queries.
    // For now, stick to simple fetch to match logic, or optimize slightly.

    // Active orders
    const { count: activeOrders } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).neq("status", "entregado");

    // Pending diagnosis
    const { count: pendingDiagnosis } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).in("status", ["recibido", "diagnostico"]);

    // Ready for pickup
    const { count: readyForPickup } = await this.client.from("repair_orders").select("*", { count: 'exact', head: true }).eq("status", "listo");

    // Monthly Revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { data: payments } = await this.client.from("payments").select("amount").gte("date", monthStart).lte("date", monthEnd);

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
