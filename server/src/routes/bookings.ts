import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import {
  couponErrorMessages,
  normalizeCouponCode,
  validateCouponForCourse,
} from "../coupons.js";
import { sendBookingCancellationEmail, sendBookingConfirmationEmail } from "../mail.js";
import { prisma } from "../prisma.js";

export const bookingsRouter = Router();

const createSchema = z.object({
  slotId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  couponCode: z.string().optional().or(z.literal("")),
  lang: z.enum(["en", "he"]).optional(),
});

// Public: guests book with their contact details, no account needed.
bookingsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { slotId, name, phone, email, couponCode: rawCouponCode, lang } = parsed.data;
  const couponCode = rawCouponCode ? normalizeCouponCode(rawCouponCode) : null;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.timeSlot.findUnique({
        where: { id: slotId },
        include: {
          course: true,
          _count: { select: { bookings: { where: { status: "confirmed" } } } },
        },
      });
      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.startsAt <= new Date()) throw new Error("SLOT_IN_PAST");
      if (slot._count.bookings >= slot.course.maxParticipants) throw new Error("SLOT_FULL");

      const duplicate = await tx.booking.findFirst({
        where: { slotId, phone, status: "confirmed" },
      });
      if (duplicate) throw new Error("ALREADY_BOOKED");

      let couponId: string | null = null;
      let originalPrice: number | null = null;
      let finalPrice: number | null = null;
      let discountAmount: number | null = null;
      let appliedCouponCode: string | null = null;

      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
        if (!coupon) throw new Error("COUPON_NOT_FOUND");

        const result = validateCouponForCourse(
          coupon,
          slot.course.id,
          slot.course.price,
          slot.course.customPrice
        );
        if (typeof result === "string") throw new Error(result);

        couponId = coupon.id;
        appliedCouponCode = coupon.code;
        originalPrice = slot.course.price;
        discountAmount = result.discountAmount;
        finalPrice = result.finalPrice;

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return tx.booking.create({
        data: {
          slotId,
          name,
          phone,
          email,
          couponId,
          couponCode: appliedCouponCode,
          originalPrice,
          finalPrice,
          discountAmount,
        },
        include: { slot: { include: { course: true } } },
      });
    });

    void sendBookingConfirmationEmail({
      to: email,
      name: booking.name,
      courseTitleEn: booking.slot.course.titleEn,
      courseTitleHe: booking.slot.course.titleHe,
      startsAt: booking.slot.startsAt,
      endsAt: booking.slot.endsAt,
      price: booking.slot.course.price,
      customPrice: booking.slot.course.customPrice,
      originalPrice: booking.originalPrice,
      finalPrice: booking.finalPrice,
      discountAmount: booking.discountAmount,
      couponCode: booking.couponCode,
      lang,
    });

    res.status(201).json({ booking });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      SLOT_NOT_FOUND: [404, "Time slot not found"],
      SLOT_IN_PAST: [400, "This time slot is in the past"],
      SLOT_FULL: [409, "This time slot is fully booked"],
      ALREADY_BOOKED: [409, "This phone number already has a booking for this time slot"],
      COUPON_NOT_FOUND: [400, couponErrorMessages.COUPON_NOT_FOUND],
      COUPON_INACTIVE: [400, couponErrorMessages.COUPON_INACTIVE],
      COUPON_EXPIRED: [400, couponErrorMessages.COUPON_EXPIRED],
      COUPON_EXHAUSTED: [400, couponErrorMessages.COUPON_EXHAUSTED],
      COUPON_WRONG_COURSE: [400, couponErrorMessages.COUPON_WRONG_COURSE],
      COUPON_CUSTOM_PRICE: [400, couponErrorMessages.COUPON_CUSTOM_PRICE],
    };
    const [status, message] = map[code] ?? [500, "Booking failed"];
    res.status(status).json({ error: message });
  }
});

// Admin only: cancel a booking.
bookingsRouter.post("/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new Error("NOT_FOUND");

      const updated = await tx.booking.update({
        where: { id: req.params.id },
        data: { status: "cancelled" },
        include: { slot: { include: { course: true } } },
      });

      if (existing.status === "confirmed" && existing.couponId) {
        await tx.coupon.update({
          where: { id: existing.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      return { updated, wasConfirmed: existing.status === "confirmed" };
    });

    if (result.wasConfirmed && result.updated.email) {
      void sendBookingCancellationEmail({
        to: result.updated.email,
        name: result.updated.name,
        courseTitleEn: result.updated.slot.course.titleEn,
        courseTitleHe: result.updated.slot.course.titleHe,
        startsAt: result.updated.slot.startsAt,
        endsAt: result.updated.slot.endsAt,
      });
    }

    res.json({ booking: result.updated });
  } catch (e) {
    const message = e instanceof Error && e.message === "NOT_FOUND" ? 404 : 500;
    res.status(message).json({ error: "Booking not found" });
  }
});
