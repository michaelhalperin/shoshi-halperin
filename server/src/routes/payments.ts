import { Router } from "express";
import express from "express";
import { approveGrowTransaction, growConfigured } from "../grow.js";
import { sendAdminNewBookingEmail, sendBookingConfirmationEmail } from "../mail.js";
import { prisma } from "../prisma.js";

export const paymentsRouter = Router();

// Lets the booking form say "continue to payment" only when Grow is set up.
paymentsRouter.get("/config", (_req, res) => res.json({ online: growConfigured() }));

// Grow posts form-encoded data (`data[sum]=...`), not JSON.
paymentsRouter.post("/grow/notify", express.urlencoded({ extended: true }), async (req, res) => {
  const body = req.body as { status?: string; data?: Record<string, unknown> };
  const raw = body.data ?? {};
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") data[k] = v;
  const customFields = (raw.customFields ?? {}) as Record<string, string>;
  const bookingId = customFields.cField1;

  // Acknowledge quickly; Grow only needs a 200.
  res.status(200).json({ ok: true });

  try {
    if (String(body.status) !== "1" || !bookingId) return;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { course: true } } },
    });
    if (!booking || booking.paymentStatus === "paid") return;

    // There is no signature, so the secret process token and the amount must match what we issued.
    const expected = booking.finalPrice ?? booking.slot.course.price;
    const tokenOk = !!booking.paymentProcessToken && data.processToken === booking.paymentProcessToken;
    const sumOk = Math.abs(Number(data.sum) - expected) < 0.01;
    if (!tokenOk || !sumOk) {
      console.error("Grow callback rejected for booking", bookingId, { tokenOk, sumOk });
      return;
    }

    const paid = await prisma.booking.updateMany({
      where: { id: booking.id, paymentStatus: { not: "paid" } },
      data: {
        paymentStatus: "paid",
        paymentTransactionId: data.transactionId ?? null,
        paidAmount: Number(data.sum),
        paidAt: new Date(),
        // A paid booking is confirmed; one that expired while paying is revived.
        status: "confirmed",
      },
    });
    if (paid.count === 0) return;
    void approveGrowTransaction(data);

    const details = {
      bookingId: booking.id,
      name: booking.name,
      courseTitleEn: booking.slot.course.titleEn,
      courseTitleHe: booking.slot.course.titleHe,
      startsAt: booking.slot.startsAt,
      endsAt: booking.slot.endsAt,
    };
    if (booking.email) {
      void sendBookingConfirmationEmail({
        ...details,
        to: booking.email,
        price: booking.slot.course.price,
        customPrice: booking.slot.course.customPrice,
        originalPrice: booking.originalPrice,
        finalPrice: booking.finalPrice,
        discountAmount: booking.discountAmount,
        couponCode: booking.couponCode,
        lang: booking.lang === "en" ? "en" : "he",
      });
    }
    const taken = await prisma.booking.count({
      where: { slotId: booking.slotId, status: { in: ["pending", "confirmed"] } },
    });
    await sendAdminNewBookingEmail({
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      courseTitleHe: booking.slot.course.titleHe,
      startsAt: booking.slot.startsAt,
      endsAt: booking.slot.endsAt,
      spotsLeft: booking.slot.course.maxParticipants - taken,
    });
  } catch (err) {
    console.error("Grow callback failed:", err);
  }
});
