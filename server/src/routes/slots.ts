import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { sendBookingCancellationEmail, sendSlotChangedEmail } from "../mail.js";
import { prisma } from "../prisma.js";
import { publicCache } from "../publicCache.js";

export const slotsRouter = Router();

function sixMonthsFromNow() {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date;
}

// List slots for a course (public) — includes how many spots are taken.
slotsRouter.get("/", publicCache(30), async (req, res) => {
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const slots = await prisma.timeSlot.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      startsAt: {
        gte: new Date(),
        ...(courseId ? {} : { lte: sixMonthsFromNow() }),
      },
    },
    orderBy: { startsAt: "asc" },
    include: {
      course: { select: { maxParticipants: true } },
      _count: { select: { bookings: { where: { status: { in: ["pending", "confirmed"] } } } } },
    },
  });
  res.json({
    slots: slots.map((s) => ({
      id: s.id,
      courseId: s.courseId,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.course.maxParticipants,
      booked: s._count.bookings,
    })),
  });
});

const slotSchema = z.object({
  courseId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

slotsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { courseId, startsAt, endsAt } = parsed.data;
  if (new Date(endsAt) <= new Date(startsAt)) {
    return res.status(400).json({ error: "End time must be after start time" });
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: "Course not found" });
  const slot = await prisma.timeSlot.create({
    data: {
      courseId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      capacity: course.maxParticipants,
    },
  });
  res.status(201).json({ slot });
});

slotsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = slotSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { startsAt, endsAt } = parsed.data;
  const existing = await prisma.timeSlot.findUnique({
    where: { id: req.params.id },
    include: { course: { select: { maxParticipants: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Slot not found" });

  try {
    const slot = await prisma.timeSlot.update({
      where: { id: req.params.id },
      data: {
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
        capacity: existing.course.maxParticipants,
      },
      include: {
        course: { select: { titleEn: true, titleHe: true } },
        bookings: { where: { status: { in: ["pending", "confirmed"] }, email: { not: null } } },
      },
    });

    const timeChanged =
      slot.startsAt.getTime() !== existing.startsAt.getTime() ||
      slot.endsAt.getTime() !== existing.endsAt.getTime();
    if (timeChanged) {
      for (const booking of slot.bookings) {
        void sendSlotChangedEmail({
          bookingId: booking.id,
          to: booking.email!,
          name: booking.name,
          courseTitleEn: slot.course.titleEn,
          courseTitleHe: slot.course.titleHe,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          oldStartsAt: existing.startsAt,
          oldEndsAt: existing.endsAt,
          lang: booking.lang === "en" ? "en" : "he",
        });
      }
    }

    const { bookings: _bookings, course: _course, ...slotData } = slot;
    res.json({ slot: slotData });
  } catch {
    res.status(404).json({ error: "Slot not found" });
  }
});

slotsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const slot = await prisma.timeSlot.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { titleEn: true, titleHe: true } },
        bookings: { where: { status: { in: ["pending", "confirmed"] }, email: { not: null } } },
      },
    });
    await prisma.timeSlot.delete({ where: { id: req.params.id } });
    if (slot && slot.startsAt > new Date()) {
      for (const booking of slot.bookings) {
        void sendBookingCancellationEmail({
          bookingId: booking.id,
          to: booking.email!,
          name: booking.name,
          courseTitleEn: slot.course.titleEn,
          courseTitleHe: slot.course.titleHe,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          lang: booking.lang === "en" ? "en" : "he",
        });
      }
    }
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Slot not found" });
  }
});
