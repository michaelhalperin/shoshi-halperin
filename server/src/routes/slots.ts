import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";

export const slotsRouter = Router();

// List slots for a course (public) — includes how many spots are taken.
slotsRouter.get("/", async (req, res) => {
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const slots = await prisma.timeSlot.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    include: {
      course: { select: { maxParticipants: true } },
      _count: { select: { bookings: { where: { status: "confirmed" } } } },
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
    });
    res.json({ slot });
  } catch {
    res.status(404).json({ error: "Slot not found" });
  }
});

slotsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.timeSlot.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Slot not found" });
  }
});
