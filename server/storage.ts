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
  type InsertUser 
} from "@shared/schema";
import { randomUUID } from "crypto";

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
      phone: "+54 11 5555-1234",
      email: "maria.garcia@email.com",
      address: "Av. Corrientes 1234, CABA",
      notes: "Cliente frecuente",
    };
    const client2: Client = {
      id: "client-2",
      name: "Juan Pérez",
      phone: "+54 11 5555-5678",
      email: "juan.perez@email.com",
      address: "Calle Florida 567, CABA",
      notes: "",
    };
    const client3: Client = {
      id: "client-3",
      name: "Ana López",
      phone: "+54 11 5555-9012",
      email: "",
      address: "",
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
    const client: Client = { ...insertClient, id };
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
    const device: Device = { ...insertDevice, id };
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

export const storage = new MemStorage();
