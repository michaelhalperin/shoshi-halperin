import { Router } from "express";
import { listTestimonialItems } from "../testimonials.js";
import { publicCache } from "../publicCache.js";

export const testimonialsRouter = Router();

testimonialsRouter.get("/", publicCache(300), async (_req, res) => {
  try {
    const images = await listTestimonialItems();
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load testimonials" });
  }
});
