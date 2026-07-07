import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";
import { deleteImageByUrl } from "../s3.js";

export const coursesRouter = Router();

coursesRouter.get("/", async (req, res) => {
  const includeInactive = req.query.all === "1";
  const courses = await prisma.course.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { slots: true } } },
  });
  res.json({ courses });
});

coursesRouter.get("/:id", async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json({ course });
});

const courseSchema = z.object({
  titleEn: z.string().min(1),
  titleHe: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionHe: z.string().min(1),
  price: z.number().min(0),
  durationMin: z.number().int().min(5),
  maxParticipants: z.number().int().min(1).default(8),
  imageUrl: z.string().nullable().optional(),
  color: z.string().default("amber"),
  active: z.boolean().default(true),
});

coursesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const course = await prisma.course.create({ data: parsed.data });
  res.status(201).json({ course });
});

coursesRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Course not found" });

  if (
    parsed.data.maxParticipants !== undefined &&
    parsed.data.maxParticipants !== existing.maxParticipants
  ) {
    const slots = await prisma.timeSlot.findMany({
      where: { courseId: req.params.id },
      include: { _count: { select: { bookings: { where: { status: "confirmed" } } } } },
    });
    if (slots.some((s) => s._count.bookings > parsed.data.maxParticipants!)) {
      return res.status(400).json({
        error: "Cannot set max participants below current bookings on one or more time slots",
      });
    }
    await prisma.timeSlot.updateMany({
      where: { courseId: req.params.id },
      data: { capacity: parsed.data.maxParticipants },
    });
  }

  try {
    const course = await prisma.course.update({ where: { id: req.params.id }, data: parsed.data });
    if (parsed.data.imageUrl !== undefined && parsed.data.imageUrl !== existing.imageUrl) {
      deleteImageByUrl(existing.imageUrl, "courses").catch((err) =>
        console.warn("Failed to delete replaced course image:", err)
      );
    }
    res.json({ course });
  } catch {
    res.status(404).json({ error: "Course not found" });
  }
});

coursesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Course not found" });
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    deleteImageByUrl(existing.imageUrl, "courses").catch((err) =>
      console.warn("Failed to delete course image:", err)
    );
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Course not found" });
  }
});
