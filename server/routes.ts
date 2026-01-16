import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertRepairOrderSchema, insertClientSchema, insertDeviceSchema, insertPaymentSchema, insertSettingsSchema, insertProductSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerRoutes(server: Server, app: Express) {
  const getUserId = async (req: Request): Promise<string> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return "demo-user-id";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return "demo-user-id";
      return user.id;
    } catch (e) {
      console.error("Error validando usuario:", e);
      return "demo-user-id";
    }
  };

  // CLIENTS
  app.get("/api/clients", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getClients(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/clients/:id", async (req, res) => { const c = await storage.getClient(req.params.id); if (!c) return res.status(404).json({ error: "Not found" }); res.json(c); });
  app.post("/api/clients", async (req, res) => { try { const p = insertClientSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createClient({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/clients/:id", async (req, res) => { try { const u = await storage.updateClient(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // DEVICES
  app.get("/api/devices", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getDevices(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/devices/:clientId", async (req, res) => { try { res.json(await storage.getDevicesByClient(req.params.clientId)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/devices", async (req, res) => { try { const p = insertDeviceSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createDevice({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // ORDERS
  app.get("/api/orders", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getOrdersWithDetails(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/recent", async (req, res) => { try { const u = await getUserId(req); const o = await storage.getOrdersWithDetails(u); res.json(o.slice(0, 5)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/:id", async (req, res) => { try { const o = await storage.getOrderWithDetails(req.params.id); if (!o) return res.status(404).json({ error: "Not found" }); res.json(o); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/orders", async (req, res) => { try { const p = insertRepairOrderSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createOrder({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/orders/:id", async (req, res) => { try { const u = await storage.updateOrder(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // PAYMENTS
  app.get("/api/payments", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getPaymentsWithOrders(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/payments", async (req, res) => { try { const p = insertPaymentSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createPayment({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // STATS
  app.get("/api/stats", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getStats(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // SETTINGS
  app.get("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json((await storage.getSettings(u)) || {}); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/settings", async (req, res) => { try { const p = insertSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.json(await storage.updateSettings(u, p.data)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // PRODUCTS
  app.get("/api/products", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getProducts(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/products", async (req, res) => { try { const p = insertProductSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createProduct({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/products/:id", async (req, res) => { try { const u = await storage.updateProduct(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });

  return server;
}