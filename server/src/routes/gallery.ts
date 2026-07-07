import { Router } from "express";
import { listGalleryItems } from "../gallery.js";

export const galleryRouter = Router();

galleryRouter.get("/", async (_req, res) => {
  try {
    const images = await listGalleryItems();
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});
