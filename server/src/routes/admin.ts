import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/stats", async (_req, res) => {
  const now = new Date();
  const [courses, upcoming, totalBookings] = await Promise.all([
    prisma.course.count({ where: { active: true } }),
    prisma.booking.count({ where: { status: "confirmed", slot: { startsAt: { gte: now } } } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
  ]);
  res.json({ stats: { courses, upcoming, totalBookings } });
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
