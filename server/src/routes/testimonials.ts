import { Router } from "express";
import { listTestimonialItems } from "../testimonials.js";

export const testimonialsRouter = Router();

testimonialsRouter.get("/", async (_req, res) => {
  try {
    const images = await listTestimonialItems();
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load testimonials" });
  }
});
