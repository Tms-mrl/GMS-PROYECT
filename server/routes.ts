import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertRepairOrderSchema, insertClientSchema, insertDeviceSchema, insertPaymentSchema, insertSettingsSchema, insertProductSchema, insertExpenseSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerRoutes(server: Server, app: Express) {
  const getUserId = async (req: Request): Promise<string> => {
    // CAMBIO IMPORTANTE: Usamos un ID que NO existe en la base de datos.
    // Así, si falla la autenticación, la base de datos buscará este ID, 
    // no encontrará nada y devolverá una lista vacía (lo correcto y seguro).
    const GUEST_ID = "guest-user-no-access";

    try {
      const authHeader = req.headers.authorization;

      // 1. Si no hay cabecera, es un invitado.
      if (!authHeader) {
        // console.log("👻 Petición anónima. Tratando como invitado.");
        return GUEST_ID;
      }

      // 2. Validamos el token con Supabase
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);

      // 3. Si hay error o no hay usuario, es un invitado.
      if (error || !user) {
        console.log("❌ Token rechazado o expirado:", error?.message);
        return GUEST_ID;
      }

      // 4. ¡ÉXITO! Devolvemos SU ID real.
      return user.id;

    } catch (e) {
      console.error("Error crítico validando usuario:", e);
      return GUEST_ID;
    }
  };

  // ... (El resto de tus rutas API sigue igual aquí abajo) ...

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
  app.post("/api/payments", async (req, res) => {
    try {
      // 1. Validamos con tu nuevo schema
      const p = insertPaymentSchema.safeParse(req.body);

      if (!p.success) {
        console.log("Error de validación:", p.error.errors);
        return res.status(400).json({ error: p.error.errors });
      }

      const u = await getUserId(req);

      // 2. Mapeamos los datos para Storage
      const paymentData = {
        amount: p.data.amount,
        method: p.data.method,
        notes: p.data.notes,
        orderId: p.data.orderId || undefined, // Nota: Storage suele esperar camelCase en la interfaz, el mapeo a snake_case lo hace dentro

        // --- LA CORRECCIÓN CLAVE ---
        // Debemos llamarlo 'items' para que storage.createPayment lo reconozca
        // y ejecute la lógica de descontar deuda y stock.
        items: p.data.items || [],

        userId: u
      };

      // 3. Guardar en DB
      // Usamos 'as any' porque estamos construyendo el objeto manualmente y a veces TS se queja
      const result = await storage.createPayment(paymentData as any);

      res.status(201).json(result);

    } catch (e) {
      console.error("Error al guardar pago:", e);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // EXPENSES
  app.get("/api/expenses", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getExpenses(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/expenses", async (req, res) => { try { const p = insertExpenseSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createExpense({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // STATS
  app.get("/api/stats", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getStats(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // SETTINGS
  app.get("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json((await storage.getSettings(u)) || {}); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/settings", async (req, res) => { try { const p = insertSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.json(await storage.updateSettings(u, p.data)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  // PRODUCTS
  app.get("/api/products", async (req, res) => {
    try {
      const u = await getUserId(req);
      // console.log("🔍 Solicitando productos para:", u);
      const products = await storage.getProducts(u);
      res.json(products);
    } catch (e) {
      res.status(500).json({ error: "Error fetching products" });
    }
  });
  app.post("/api/products", async (req, res) => { try { const p = insertProductSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createProduct({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/products/:id", async (req, res) => { try { const u = await storage.updateProduct(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const u = await getUserId(req);
      await storage.deleteProduct(req.params.id, u);
      res.sendStatus(204);
    } catch (e) {
      res.status(500).json({ error: "Error deleting product" });
    }
  });

  return server;
}