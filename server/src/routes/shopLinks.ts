import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { prisma } from "../prisma.js";
import { withAttributedUrl } from "../shopLinks.js";

export const shopLinksRouter = Router();

const shopLinkSchema = z.object({
  titleEn: z.string().min(1),
  titleHe: z.string().min(1),
  categoryEn: z.string().min(1),
  categoryHe: z.string().min(1),
  shopName: z.string().min(1).default("Batshi Home"),
  productUrl: z.string().url(),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  utmSource: z.string().min(1).default("shoshi_halperin"),
  utmMedium: z.string().min(1).default("referral"),
  utmCampaign: z.string().nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

shopLinksRouter.get("/", async (req, res) => {
  const includeInactive = req.query.all === "1";
  const links = await prisma.shopLink.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ categoryEn: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  res.json({ links: links.map(withAttributedUrl) });
});

shopLinksRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = shopLinkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const link = await prisma.shopLink.create({ data: parsed.data });
  res.status(201).json({ link: withAttributedUrl(link) });
});

shopLinksRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = shopLinkSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  try {
    const link = await prisma.shopLink.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ link: withAttributedUrl(link) });
  } catch {
    res.status(404).json({ error: "Shop link not found" });
  }
});

shopLinksRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.shopLink.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Shop link not found" });
  }
});
