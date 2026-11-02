import { Router } from "express";
import { z } from "zod";
import { sendContactMessageEmail } from "../mail.js";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(2000),
  // Honeypot: real visitors never fill this in.
  website: z.string().optional(),
});

// Public: visitors send a message to the owner.
contactRouter.post("/", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { name, email, phone, message, website } = parsed.data;

  if (website) return res.json({ ok: true });

  const sent = await sendContactMessageEmail({ name, email, phone: phone || null, message });
  if (!sent && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "Email is not configured. Contact support." });
  }
  res.json({ ok: true });
});
