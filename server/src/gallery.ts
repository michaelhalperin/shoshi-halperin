import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { isS3Configured, listImages, type MediaType } from "./s3.js";

export interface GalleryItem {
  key: string;
  url: string;
  type: MediaType;
  lastModified: string | null;
}

function parseKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function applyGalleryOrder<T extends { key: string; lastModified: string | null }>(
  images: T[],
  orderedKeys: string[]
): T[] {
  const byKey = new Map(images.map((image) => [image.key, image]));
  const result: T[] = [];
  const seen = new Set<string>();

  for (const key of orderedKeys) {
    const image = byKey.get(key);
    if (image) {
      result.push(image);
      seen.add(key);
    }
  }

  const remaining = images
    .filter((image) => !seen.has(image.key))
    .sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));

  return [...result, ...remaining];
}

export async function getGalleryOrderKeys() {
  const record = await prisma.galleryOrder.findUnique({ where: { id: "default" } });
  return parseKeys(record?.keys);
}

export async function saveGalleryOrderKeys(keys: string[]) {
  const saved = await prisma.galleryOrder.upsert({
    where: { id: "default" },
    create: { id: "default", keys: keys as Prisma.InputJsonValue },
    update: { keys: keys as Prisma.InputJsonValue },
  });
  return parseKeys(saved.keys);
}

export async function removeFromGalleryOrder(key: string) {
  const keys = await getGalleryOrderKeys();
  if (!keys.includes(key)) return;
  await saveGalleryOrderKeys(keys.filter((item) => item !== key));
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  if (!isS3Configured()) return [];
  const [images, orderedKeys] = await Promise.all([listImages("gallery"), getGalleryOrderKeys()]);
  if (orderedKeys.length === 0) return images;
  return applyGalleryOrder(images, orderedKeys);
}
