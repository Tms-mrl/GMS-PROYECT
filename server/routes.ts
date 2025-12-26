import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertDeviceSchema, 
  insertRepairOrderSchema,
  insertPaymentSchema 
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Error fetching stats" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Error fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Error fetching client" });
    }
  });

  app.get("/api/clients/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByClient(req.params.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Error fetching client orders" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const parsed = insertClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const client = await storage.createClient(parsed.data);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ error: "Error creating client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Error updating client" });
    }
  });

  // Devices
  app.get("/api/devices", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      if (clientId) {
        const devices = await storage.getDevicesByClient(clientId);
        return res.json(devices);
      }
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Error fetching devices" });
    }
  });

  app.get("/api/devices/:clientId", async (req, res) => {
    try {
      const devices = await storage.getDevicesByClient(req.params.clientId);
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Error fetching devices" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const parsed = insertDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const device = await storage.createDevice(parsed.data);
      res.status(201).json(device);
    } catch (error) {
      res.status(500).json({ error: "Error creating device" });
    }
  });

  // Orders - recent endpoint first to avoid :id matching "recent"
  app.get("/api/orders/recent", async (req, res) => {
    try {
      const orders = await storage.getOrdersWithDetails();
      res.json(orders.slice(0, 6));
    } catch (error) {
      res.status(500).json({ error: "Error fetching recent orders" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersWithDetails();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Error fetching orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderWithDetails(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Error fetching order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = insertRepairOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const order = await storage.createOrder(parsed.data);
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: "Error creating order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      // Only allow specific fields to be updated
      const allowedFields = [
        "status", "problem", "diagnosis", "solution", 
        "technicianName", "estimatedCost", "finalCost", 
        "estimatedDate", "priority", "notes"
      ];
      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const order = await storage.updateOrder(req.params.id, updates);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Error updating order" });
    }
  });

  // Payments
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsWithOrders();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Error fetching payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const parsed = insertPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const payment = await storage.createPayment(parsed.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Error creating payment" });
    }
  });

  return httpServer;
}
