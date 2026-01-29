import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertRepairOrderSchema, insertClientSchema, insertDeviceSchema, insertPaymentSchema, insertSettingsSchema, insertProductSchema, insertExpenseSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import nodemailer from "nodemailer";

// 1. CONFIGURACIÓN MULTER (RAM)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Límite 5MB
});

// Cliente Global de Supabase (Solo para verificar usuarios, NO para storage)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerRoutes(server: Server, app: Express) {
  const getUserId = async (req: Request): Promise<string> => {
    const GUEST_ID = "guest-user-no-access";
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return GUEST_ID;

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) return GUEST_ID;

      return user.id;
    } catch (e) {
      console.error("Error crítico validando usuario:", e);
      return GUEST_ID;
    }
  };

  // --- RUTAS ESTÁNDAR (Sin cambios) ---
  app.get("/api/clients", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getClients(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/clients/:id", async (req, res) => { const c = await storage.getClient(req.params.id); if (!c) return res.status(404).json({ error: "Not found" }); res.json(c); });
  app.post("/api/clients", async (req, res) => {
    try {
      const parseResult = insertClientSchema.safeParse(req.body);
      if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });
      const userId = await getUserId(req);
      const newClient = await storage.createClient({ ...parseResult.data, userId: userId, user_id: userId } as any);
      res.status(201).json(newClient);
    } catch (e) { res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.patch("/api/clients/:id", async (req, res) => { try { const u = await storage.updateClient(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/devices", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getDevices(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/devices/:clientId", async (req, res) => { try { res.json(await storage.getDevicesByClient(req.params.clientId)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/devices", async (req, res) => { try { const p = insertDeviceSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createDevice({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/orders", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getOrdersWithDetails(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/recent", async (req, res) => { try { const u = await getUserId(req); const o = await storage.getOrdersWithDetails(u); res.json(o.slice(0, 5)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.get("/api/orders/:id", async (req, res) => { try { const o = await storage.getOrderWithDetails(req.params.id); if (!o) return res.status(404).json({ error: "Not found" }); res.json(o); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/orders", async (req, res) => { try { const p = insertRepairOrderSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createOrder({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/orders/:id", async (req, res) => { try { const u = await storage.updateOrder(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/payments", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getPaymentsWithOrders(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/payments", async (req, res) => {
    try {
      const p = insertPaymentSchema.safeParse(req.body);
      if (!p.success) return res.status(400).json({ error: p.error.errors });
      const u = await getUserId(req);
      const paymentData = { amount: p.data.amount, method: p.data.method, notes: p.data.notes, orderId: p.data.orderId || undefined, items: p.data.items || [], userId: u };
      const result = await storage.createPayment(paymentData as any);
      res.status(201).json(result);
    } catch (e) { res.status(500).json({ error: "Error interno" }); }
  });

  app.get("/api/expenses", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getExpenses(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/expenses", async (req, res) => { try { const p = insertExpenseSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createExpense({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/stats", async (req, res) => { try { const u = await getUserId(req); res.json(await storage.getStats(u)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/settings", async (req, res) => { try { const u = await getUserId(req); res.json((await storage.getSettings(u)) || {}); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/settings", async (req, res) => { try { const p = insertSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.json(await storage.updateSettings(u, p.data)); } catch (e) { res.status(500).json({ error: "Error" }); } });

  app.get("/api/products", async (req, res) => { try { const u = await getUserId(req); const products = await storage.getProducts(u); res.json(products); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.post("/api/products", async (req, res) => { try { const p = insertProductSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.errors }); const u = await getUserId(req); res.status(201).json(await storage.createProduct({ ...p.data, userId: u, user_id: u } as any)); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.patch("/api/products/:id", async (req, res) => { try { const u = await storage.updateProduct(req.params.id, req.body); if (!u) return res.status(404).json({ error: "Not found" }); res.json(u); } catch (e) { res.status(500).json({ error: "Error" }); } });
  app.delete("/api/products/:id", async (req, res) => { try { const u = await getUserId(req); await storage.deleteProduct(req.params.id, u); res.sendStatus(204); } catch (e) { res.status(500).json({ error: "Error deleting product" }); } });

  // ---------------------------------------------------------
  // RUTA UPLOAD CORREGIDA (FIX "Unexpected field")
  // ---------------------------------------------------------
  // CORRECCIÓN: Usamos "file" porque eso es lo que envía tu Frontend.
  app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se subió ningún archivo" });
      }

      // Convertir a Base64
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const mimeType = req.file.mimetype;
      const dataURI = `data:${mimeType};base64,${b64}`;

      // Devolver la URL
      res.json({ url: dataURI });
    } catch (error) {
      console.error("Error en upload:", error);
      res.status(500).json({ message: "Error al procesar la imagen" });
    }
  });

  // SUPPORT
  app.post("/api/support", async (req, res) => {
    try {
      const { message, imageUrls } = req.body;
      const u = await getUserId(req);
      let username = "Usuario";
      if (u !== "guest-user-no-access") { username = `Usuario (ID: ${u})`; }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        return res.status(500).json({ error: "Configuration Error: Missing Email Credentials" });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: `Ticket de Soporte - ${username}`,
        html: `<h3>Nuevo Mensaje de Soporte</h3><p><strong>Usuario:</strong> ${username}</p><p><strong>Mensaje:</strong></p><p style="white-space: pre-wrap;">${message}</p>${imageUrls && imageUrls.length > 0 ? `<hr/><p><strong>Imágenes Adjuntas:</strong></p><ul>${imageUrls.map((url: string) => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>` : ''}`
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (e: any) {
      res.status(500).json({ error: "Error sending email: " + e.message });
    }
  });

  return server;
}