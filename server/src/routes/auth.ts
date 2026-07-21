import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { ADMIN_EMAIL } from "../adminConfig.js";
import { clearAuthCookie, readUser, requireAuth, setAuthCookie } from "../auth.js";
import { sendPasswordResetEmail } from "../mail.js";
import { prisma } from "../prisma.js";

export const authRouter = Router();

const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  mustSetPassword: true,
} as const;

const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
const setPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() });
const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });
const forgotPasswordSchema = z.object({ email: z.string().email() });

function clientBaseUrl() {
  const url = (process.env.CLIENT_URL ?? "http://localhost:5173").split(",")[0]?.trim();
  return url?.replace(/\/$/, "") ?? "http://localhost:5173";
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  mustSetPassword: boolean;
  passwordHash?: string;
}) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  setAuthCookie(res, { id: user.id, role: user.role });
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const auth = readUser(req);
  if (!auth) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: publicUser });
  res.json({ user });
});

authRouter.post("/set-password", requireAuth, async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustSetPassword: false, passwordResetToken: null, passwordResetExpires: null },
    select: publicUser,
  });
  res.json({ user: updated });
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && email === ADMIN_EMAIL) {
    const token = crypto.randomBytes(32).toString("hex");
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires },
    });

    const resetUrl = `${clientBaseUrl()}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail(email, resetUrl);
    if (!sent && process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Email is not configured. Contact support." });
    }
  }

  res.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: parsed.data.token,
      passwordResetExpires: { gt: new Date() },
    },
  });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset link" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustSetPassword: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
    select: publicUser,
  });
  setAuthCookie(res, { id: updated.id, role: updated.role });
  res.json({ user: updated });
});
