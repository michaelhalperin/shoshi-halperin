import { Router } from "express";
import { z } from "zod";
import {
  couponErrorMessages,
  normalizeCouponCode,
  validateCouponForCourse,
} from "../coupons.js";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";

export const couponsRouter = Router();

const couponSchema = z.object({
  code: z.string().min(2).max(32),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().min(1),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
  courseId: z.string().nullable().optional(),
});

const validateSchema = z.object({
  code: z.string().min(1),
  courseId: z.string(),
});

// Public: check a coupon before booking.
couponsRouter.post("/validate", async (req, res) => {
  const parsed = validateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const code = normalizeCouponCode(parsed.data.code);
  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return res.status(404).json({ error: couponErrorMessages.COUPON_NOT_FOUND });

  const result = validateCouponForCourse(coupon, course.id, course.price, course.customPrice);
  if (typeof result === "string") {
    return res.status(400).json({ error: couponErrorMessages[result] });
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalPrice: course.price,
    discountAmount: result.discountAmount,
    finalPrice: result.finalPrice,
  });
});

// Admin: list all coupons.
couponsRouter.get("/", requireAdmin, async (_req, res) => {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, titleEn: true, titleHe: true } },
      _count: { select: { bookings: true } },
    },
  });
  res.json({ coupons });
});

// Admin: create coupon.
couponsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const code = normalizeCouponCode(parsed.data.code);
  const { expiresAt, courseId, maxUses, ...rest } = parsed.data;

  if (rest.discountType === "percent" && rest.discountValue > 100) {
    return res.status(400).json({ error: "Percent discount cannot exceed 100" });
  }

  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(400).json({ error: "Course not found" });
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        ...rest,
        code,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        courseId: courseId ?? null,
      },
      include: { course: { select: { id: true, titleEn: true, titleHe: true } } },
    });
    res.status(201).json({ coupon });
  } catch {
    res.status(409).json({ error: "A coupon with this code already exists" });
  }
});

// Admin: update coupon.
couponsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = couponSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Coupon not found" });

  const { code, expiresAt, courseId, maxUses, discountType, discountValue, ...rest } = parsed.data;

  if (discountType === "percent" && discountValue !== undefined && discountValue > 100) {
    return res.status(400).json({ error: "Percent discount cannot exceed 100" });
  }

  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(400).json({ error: "Course not found" });
  }

  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(code !== undefined ? { code: normalizeCouponCode(code) } : {}),
        ...(discountType !== undefined ? { discountType } : {}),
        ...(discountValue !== undefined ? { discountValue } : {}),
        ...(maxUses !== undefined ? { maxUses } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        ...(courseId !== undefined ? { courseId } : {}),
      },
      include: { course: { select: { id: true, titleEn: true, titleHe: true } } },
    });
    res.json({ coupon });
  } catch {
    res.status(409).json({ error: "A coupon with this code already exists" });
  }
});

// Admin: delete coupon.
couponsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Coupon not found" });
  }
});
