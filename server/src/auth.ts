import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const COOKIE_NAME = "mom_course_token";

export interface AuthUser {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function setAuthCookie(res: Response, user: AuthUser) {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
  const production = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  const production = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
  });
}

export function readUser(req: Request): AuthUser | undefined {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (typeof payload.id === "string" && typeof payload.role === "string") {
      return { id: payload.id, role: payload.role };
    }
  } catch {
    // invalid or expired token
  }
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = readUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = readUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  req.user = user;
  next();
}
