import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertRepairOrderSchema, insertClientSchema, insertDeviceSchema, insertPaymentSchema, insertSettingsSchema, insertProductSchema, insertExpenseSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import nodemailer from "nodemailer";

const upload = multer({ storage: multer.memoryStorage() });

// Cliente Global de Supabase (Usaremos este para Storage y Auth)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerRoutes(server: Server, app: Express) {
  const getUserId = async (req: Request): Promise<string> => {
    // ID de invitado seguro
    const GUEST_ID = "guest-user-no-access";

    try {
      const authHeader = req.headers.authorization;

      // 1. Si no hay cabecera, es un invitado.
      if (!authHeader) {
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

  // CLIENTS
  app.get("/api/clients", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getClients(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/clients/:id", async (req, res) => { const c = await storage.getClient(req.params.id); if (!c) return res.status(404).json({ error: "Not found" }); res.json(c); });
  app.post("/api/clients", async (req, res) => {
    try {
      const parseResult = insertClientSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors });
      }
      const userId = await getUserId(req);
      const newClient = await storage.createClient({
        ...parseResult.data,
        userId: userId,
        user_id: userId
      } as any);
      res.status(201).json(newClient);
    } catch (e) {
      console.error("Error creating client:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
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
      const p = insertPaymentSchema.safeParse(req.body);
      if (!p.success) {
        console.log("Error de validación:", p.error.errors);
        return res.status(400).json({ error: p.error.errors });
      }
      const u = await getUserId(req);
      const paymentData = {
        amount: p.data.amount,
        method: p.data.method,
        notes: p.data.notes,
        orderId: p.data.orderId || undefined,
        items: p.data.items || [],
        userId: u
      };
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

  // --- UPLOAD ROUTE (CORREGIDA) ---
  app.post("/api/upload", upload.single("file") as any, async (req: any, res: any) => {
    try {
      // 1. Autenticación compatible (Header Token)
      const userId = await getUserId(req);

      if (userId === "guest-user-no-access") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Subida al Bucket 'logos' usando el cliente global 'supabase'
      // IMPORTANTE: El bucket en Supabase debe llamarse 'logos' y ser PÚBLICO
      const { data, error } = await supabase
        .storage
        .from('logos')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) {
        console.error("Supabase Storage Error:", error);
        return res.status(500).json({ error: "Upload failed: " + error.message });
      }

      // 3. Obtener URL Pública
      const { data: { publicUrl } } = supabase
        .storage
        .from('logos')
        .getPublicUrl(filePath);

      res.json({ url: publicUrl });

    } catch (e: any) {
      console.error("Upload exception:", e);
      res.status(500).json({ error: "Internal Server Error: " + e.message });
    }
  });

  // SUPPORT
  app.post("/api/support", async (req, res) => {
    try {
      const { message, imageUrls } = req.body;
      const u = await getUserId(req);

      let username = "Usuario";
      if (u !== "guest-user-no-access") {
        username = `Usuario (ID: ${u})`;
      }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.error("Missing Gmail credentials in env vars");
        return res.status(500).json({ error: "Configuration Error: Missing Email Credentials" });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: `Ticket de Soporte - ${username}`,
        html: `
          <h3>Nuevo Mensaje de Soporte</h3>
          <p><strong>Usuario:</strong> ${username}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
          ${imageUrls && imageUrls.length > 0 ? `
            <hr/>
            <p><strong>Imágenes Adjuntas:</strong></p>
            <ul>
              ${imageUrls.map((url: string) => `<li><a href="${url}">${url}</a></li>`).join('')}
            </ul>
          ` : ''}
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });

    } catch (e: any) {
      console.error("Error sending support email:", e);
      res.status(500).json({ error: "Error sending email: " + e.message });
    }
  });

  return server;
}