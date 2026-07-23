import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { getAboutContent, saveAboutContent } from "../about.js";
import { removeFromGalleryOrder, saveGalleryOrderKeys } from "../gallery.js";
import { prisma } from "../prisma.js";
import { deleteImage, isS3Configured, keyFromPublicUrl, listImages } from "../s3.js";
import {
  isTestimonialVideoKey,
  removeFromTestimonialOrder,
  saveTestimonialOrderKeys,
  setTestimonialPoster,
} from "../testimonials.js";
import { aboutContentSchema } from "./about.js";
import { uploadsRouter } from "./uploads.js";

const mediaOrderSchema = z.object({
  keys: z.array(z.string().min(1)),
});

const testimonialPosterSchema = z.object({
  key: z.string().min(1),
  posterUrl: z.string().url().nullable(),
  focusX: z.number().min(0).max(100).optional(),
  focusY: z.number().min(0).max(100).optional(),
  scale: z.number().min(0.5).max(3).optional(),
});

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.use(uploadsRouter);

adminRouter.put("/gallery/order", async (req, res) => {
  const parsed = mediaOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  try {
    const images = await listImages("gallery");
    const validKeys = new Set(images.map((image) => image.key));
    const uniqueKeys = [...new Set(parsed.data.keys)];
    if (!uniqueKeys.every((key) => validKeys.has(key))) {
      return res.status(400).json({ error: "Invalid gallery item key" });
    }

    const keys = await saveGalleryOrderKeys(uniqueKeys);
    res.json({ keys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save gallery order" });
  }
});

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
    await removeFromGalleryOrder(key);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(400).json({ error: message });
  }
});

adminRouter.put("/testimonials/order", async (req, res) => {
  const parsed = mediaOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  try {
    const images = await listImages("testimonials");
    const validKeys = new Set(images.map((image) => image.key));
    const uniqueKeys = [...new Set(parsed.data.keys)];
    if (!uniqueKeys.every((key) => validKeys.has(key))) {
      return res.status(400).json({ error: "Invalid testimonial item key" });
    }

    const keys = await saveTestimonialOrderKeys(uniqueKeys);
    res.json({ keys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save testimonials order" });
  }
});

adminRouter.put("/testimonials/poster", async (req, res) => {
  const parsed = testimonialPosterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  const { key, posterUrl, focusX, focusY, scale } = parsed.data;
  if (!key.startsWith("testimonials/") || !isTestimonialVideoKey(key)) {
    return res.status(400).json({ error: "Poster can only be set on a testimonial video" });
  }

  try {
    const images = await listImages("testimonials");
    if (!images.some((image) => image.key === key && image.type === "video")) {
      return res.status(400).json({ error: "Testimonial video not found" });
    }

    if (posterUrl) {
      const posterKey = keyFromPublicUrl(posterUrl);
      if (!posterKey || !posterKey.startsWith("testimonial-posters/")) {
        return res.status(400).json({ error: "Invalid poster image URL" });
      }
    }

    const saved = await setTestimonialPoster(
      key,
      posterUrl,
      posterUrl
        ? {
            x: focusX ?? 50,
            y: focusY ?? 50,
            scale: scale ?? 1,
          }
        : null
    );
    res.json({
      key,
      posterUrl: saved?.url ?? null,
      focusX: saved?.focusX ?? null,
      focusY: saved?.focusY ?? null,
      scale: saved?.scale ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save testimonial poster" });
  }
});

adminRouter.delete("/testimonials", async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  const key = typeof req.query.key === "string" ? req.query.key : "";
  if (!key) {
    return res.status(400).json({ error: "Missing image key" });
  }

  try {
    await deleteImage(key, "testimonials");
    await removeFromTestimonialOrder(key);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(400).json({ error: message });
  }
});

adminRouter.get("/about", async (_req, res) => {
  try {
    const content = await getAboutContent();
    const images = isS3Configured() ? await listImages("about") : [];
    res.json({ content, images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load about page" });
  }
});

adminRouter.put("/about", async (req, res) => {
  const parsed = aboutContentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const content = await saveAboutContent(parsed.data);
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save about page" });
  }
});

adminRouter.delete("/about", async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  const key = typeof req.query.key === "string" ? req.query.key : "";
  if (!key) {
    return res.status(400).json({ error: "Missing image key" });
  }

  try {
    await deleteImage(key, "about");
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
      course: { select: { id: true, titleEn: true, titleHe: true, maxParticipants: true } },
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
      capacity: s.course.maxParticipants,
      booked: s._count.bookings,
    })),
  });
});
