import type { Prisma } from "@prisma/client";
import { applyGalleryOrder } from "./gallery.js";
import { prisma } from "./prisma.js";
import { isS3Configured, listImages, type MediaType } from "./s3.js";

export interface TestimonialItem {
  key: string;
  url: string;
  type: MediaType;
  lastModified: string | null;
}

function parseKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export async function getTestimonialOrderKeys() {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  return parseKeys(record?.keys);
}

export async function saveTestimonialOrderKeys(keys: string[]) {
  const saved = await prisma.testimonialOrder.upsert({
    where: { id: "default" },
    create: { id: "default", keys: keys as Prisma.InputJsonValue },
    update: { keys: keys as Prisma.InputJsonValue },
  });
  return parseKeys(saved.keys);
}

export async function removeFromTestimonialOrder(key: string) {
  const keys = await getTestimonialOrderKeys();
  if (!keys.includes(key)) return;
  await saveTestimonialOrderKeys(keys.filter((item) => item !== key));
}

export async function listTestimonialItems(): Promise<TestimonialItem[]> {
  if (!isS3Configured()) return [];
  const [images, orderedKeys] = await Promise.all([
    listImages("testimonials"),
    getTestimonialOrderKeys(),
  ]);
  if (orderedKeys.length === 0) return images;
  return applyGalleryOrder(images, orderedKeys);
}
