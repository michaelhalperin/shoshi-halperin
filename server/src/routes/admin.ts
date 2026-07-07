import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";
import { deleteImage, isS3Configured } from "../s3.js";
import { uploadsRouter } from "./uploads.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.use(uploadsRouter);

adminRouter.delete("/gallery", async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  const key = typeof req.query.key === "string" ? req.query.key : "";
  if (!key) {
    return res.status(400).json({ error: "Missing image key" });
  }

  try {
    await deleteImage(key, "gallery");
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(400).json({ error: message });
  }
});

adminRouter.get("/stats", async (_req, res) => {
  const now = new Date();
  const [courses, recipes, upcoming, totalBookings] = await Promise.all([
    prisma.course.count({ where: { active: true } }),
    prisma.recipe.count({ where: { active: true } }),
    prisma.booking.count({ where: { status: "confirmed", slot: { startsAt: { gte: now } } } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
  ]);
  res.json({ stats: { courses, recipes, upcoming, totalBookings } });
});

adminRouter.get("/bookings", async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    orderBy: { slot: { startsAt: "desc" } },
    include: { slot: { include: { course: true } } },
  });
  res.json({ bookings });
});

// All slots (including past) for admin management.
adminRouter.get("/slots", async (req, res) => {
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const slots = await prisma.timeSlot.findMany({
    where: courseId ? { courseId } : {},
    orderBy: { startsAt: "desc" },
    include: {
      course: { select: { id: true, titleEn: true, titleHe: true } },
      _count: { select: { bookings: { where: { status: "confirmed" } } } },
    },
  });
  res.json({
    slots: slots.map((s) => ({
      id: s.id,
      courseId: s.courseId,
      course: s.course,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      booked: s._count.bookings,
    })),
  });
});
