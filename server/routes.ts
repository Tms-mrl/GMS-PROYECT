import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertRepairOrderSchema, insertClientSchema, insertDeviceSchema, insertPaymentSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

// Creamos un mini-cliente de Supabase solo para verificar identidades
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerRoutes(server: Server, app: Express) {

  // --- Helper: Obtener ID real validando el Token de Supabase ---
  const getUserId = async (req: Request): Promise<string> => {
    try {
      // 1. Buscamos el token en la cabecera "Authorization"
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log("⚠️ No hay token de autorización. Usando modo demo/invitado.");
        return "demo-user-id"; // O podrías devolver error 401
      }

      // 2. Limpiamos el token (quitamos la palabra "Bearer ")
      const token = authHeader.replace("Bearer ", "");

      // 3. Preguntamos a Supabase quién es este usuario
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log("⚠️ Token inválido o expirado.");
        return "demo-user-id";
      }

      // 4. ¡Éxito! Devolvemos el ID real del usuario conectado
      return user.id;

    } catch (e) {
      console.error("Error validando usuario:", e);
      return "demo-user-id";
    }
  };

  // --- CLIENTS ---
  app.get("/api/clients", async (req, res) => {
    try {
      const userId = await getUserId(req); // <--- Ahora usamos await
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Error fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const parsed = insertClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const userId = await getUserId(req); // <--- ID Real
      const clientData = { ...parsed.data, userId: userId, user_id: userId };

      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Error creating client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const updated = await storage.updateClient(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Client not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Error updating client" });
    }
  });

  // --- DEVICES ---
  app.get("/api/devices", async (req, res) => {
    try {
      const userId = await getUserId(req);
      const devices = await storage.getDevices(userId);
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
      const userId = await getUserId(req);
      const deviceData = { ...parsed.data, userId: userId, user_id: userId };
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      res.status(500).json({ error: "Error creating device" });
    }
  });

  // --- ORDERS ---
  app.get("/api/orders", async (req, res) => {
    try {
      const userId = await getUserId(req);
      // Traemos solo las órdenes de este usuario real
      const orders = await storage.getOrdersWithDetails(userId);
      res.json(orders);
    } catch (error) {
      console.error("Fetch orders error:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });

  app.get("/api/orders/recent", async (req, res) => {
    try {
      const userId = await getUserId(req);
      const orders = await storage.getOrdersWithDetails(userId);
      const recentOrders = orders.slice(0, 5);
      res.json(recentOrders);
    } catch (error) {
      console.error("Fetch recent orders error:", error);
      res.status(500).json({ error: "Error fetching recent orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderWithDetails(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
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
      const userId = await getUserId(req);
      const orderData = { ...parsed.data, userId: userId, user_id: userId };
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        error: "Error creating order",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const allowedFields = ["status", "problem", "diagnosis", "solution", "technicianName", "estimatedCost", "finalCost", "estimatedDate", "priority", "notes", "intakeChecklist"];
      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const updated = await storage.updateOrder(req.params.id, updates);
      if (!updated) return res.status(404).json({ error: "Order not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Error updating order" });
    }
  });

  // --- PAYMENTS ---
  app.get("/api/payments", async (req, res) => {
    try {
      const userId = await getUserId(req);
      const payments = await storage.getPaymentsWithOrders(userId);
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
      const userId = await getUserId(req);
      const paymentData = { ...parsed.data, userId: userId, user_id: userId };
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Error creating payment" });
    }
  });

  // --- STATS ---
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = await getUserId(req);
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Error fetching stats" });
    }
  });

  return server;
}