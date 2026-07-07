import { Router } from "express";
import { z } from "zod";
import { getAboutContent } from "../about.js";
import { isS3Configured, listImages } from "../s3.js";

export const aboutRouter = Router();

aboutRouter.get("/", async (_req, res) => {
  try {
    const [content, imageUrl] = await Promise.all([
      getAboutContent(),
      isS3Configured()
        ? listImages("about")
            .then((images) => images[0]?.url ?? null)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    res.json({ content, imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load about page" });
  }
});

export const aboutContentSchema = z
  .object({
    titleEn: z.string().min(1),
    titleHe: z.string().min(1),
    introEn: z.string().min(1),
    introHe: z.string().min(1),
    paragraphsEn: z.array(z.string().min(1)).min(1),
    paragraphsHe: z.array(z.string().min(1)).min(1),
  })
  .refine((data) => data.paragraphsEn.length === data.paragraphsHe.length, {
    message: "Paragraph counts must match in both languages",
  });
