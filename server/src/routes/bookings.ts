import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";

export const bookingsRouter = Router();

const createSchema = z.object({
  slotId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal("")),
});

// Public: guests book with their contact details, no account needed.
bookingsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { slotId, name, phone, email } = parsed.data;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.timeSlot.findUnique({
        where: { id: slotId },
        include: { _count: { select: { bookings: { where: { status: "confirmed" } } } } },
      });
      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.startsAt <= new Date()) throw new Error("SLOT_IN_PAST");
      if (slot._count.bookings >= slot.capacity) throw new Error("SLOT_FULL");

      const duplicate = await tx.booking.findFirst({
        where: { slotId, phone, status: "confirmed" },
      });
      if (duplicate) throw new Error("ALREADY_BOOKED");

      return tx.booking.create({
        data: { slotId, name, phone, email: email || null },
        include: { slot: { include: { course: true } } },
      });
    });
    res.status(201).json({ booking });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const map: Record<string, [number, string]> = {
      SLOT_NOT_FOUND: [404, "Time slot not found"],
      SLOT_IN_PAST: [400, "This time slot is in the past"],
      SLOT_FULL: [409, "This time slot is fully booked"],
      ALREADY_BOOKED: [409, "This phone number already has a booking for this time slot"],
    };
    const [status, message] = map[code] ?? [500, "Booking failed"];
    res.status(status).json({ error: message });
  }
});

// Admin only: cancel a booking.
bookingsRouter.post("/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: "cancelled" },
      include: { slot: { include: { course: true } } },
    });
    res.json({ booking });
  } catch {
    res.status(404).json({ error: "Booking not found" });
  }
});
