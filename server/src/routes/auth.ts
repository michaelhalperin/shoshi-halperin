import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { clearAuthCookie, readUser, setAuthCookie } from "../auth.js";
import { prisma } from "../prisma.js";

export const authRouter = Router();

const publicUser = { id: true, email: true, name: true, role: true } as const;

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  setAuthCookie(res, { id: user.id, role: user.role });
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
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
