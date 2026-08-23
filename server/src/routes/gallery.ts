import { Router } from "express";
import { listGalleryItems } from "../gallery.js";
import { publicCache } from "../publicCache.js";

export const galleryRouter = Router();

galleryRouter.get("/", publicCache(300), async (_req, res) => {
  try {
    const images = await listGalleryItems();
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});
