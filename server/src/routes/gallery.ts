import { Router } from "express";
import { isS3Configured, listImages } from "../s3.js";

export const galleryRouter = Router();

galleryRouter.get("/", async (_req, res) => {
  if (!isS3Configured()) {
    return res.json({ images: [] });
  }

  try {
    const images = await listImages("gallery");
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});
