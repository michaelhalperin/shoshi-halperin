import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";
import { deleteImageByUrl } from "../s3.js";

export const recipesRouter = Router();

recipesRouter.get("/", async (req, res) => {
  const includeInactive = req.query.all === "1";
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const recipes = await prisma.recipe.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { course: { select: { id: true, titleEn: true, titleHe: true } } },
  });
  res.json({ recipes });
});

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { course: { select: { id: true, titleEn: true, titleHe: true } } },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  res.json({ recipe });
});

const recipeSchema = z.object({
  titleEn: z.string().min(1),
  titleHe: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionHe: z.string().min(1),
  ingredientsEn: z.string().min(1),
  ingredientsHe: z.string().min(1),
  stepsEn: z.string().min(1),
  stepsHe: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  color: z.string().default("amber"),
  active: z.boolean().default(true),
  courseId: z.string().nullable().optional(),
});

recipesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const recipe = await prisma.recipe.create({ data: parsed.data });
  res.status(201).json({ recipe });
});

recipesRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = recipeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Recipe not found" });

  try {
    const recipe = await prisma.recipe.update({ where: { id: req.params.id }, data: parsed.data });
    if (parsed.data.imageUrl !== undefined && parsed.data.imageUrl !== existing.imageUrl) {
      deleteImageByUrl(existing.imageUrl, "recipes").catch((err) =>
        console.warn("Failed to delete replaced recipe image:", err)
      );
    }
    res.json({ recipe });
  } catch {
    res.status(404).json({ error: "Recipe not found" });
  }
});

recipesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Recipe not found" });
  try {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    deleteImageByUrl(existing.imageUrl, "recipes").catch((err) =>
      console.warn("Failed to delete recipe image:", err)
    );
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Recipe not found" });
  }
});
