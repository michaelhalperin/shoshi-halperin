import type { Prisma } from "@prisma/client";
import { applyGalleryOrder } from "./gallery.js";
import { prisma } from "./prisma.js";
import {
  deleteImageByUrl,
  isS3Configured,
  listImages,
  mediaTypeFromKey,
  type MediaType,
} from "./s3.js";

export interface PosterFocus {
  x: number;
  y: number;
  scale?: number;
}

export interface TestimonialPoster {
  url: string;
  focusX: number;
  focusY: number;
  scale: number;
}

export interface TestimonialItem {
  key: string;
  url: string;
  type: MediaType;
  lastModified: string | null;
  posterUrl: string | null;
  posterFocusX: number | null;
  posterFocusY: number | null;
  posterScale: number | null;
}

function parseKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function clampFocus(value: unknown, fallback = 50) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

function clampScale(value: unknown, fallback = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(3, Math.max(0.5, value));
  return Math.round(clamped * 100) / 100;
}

function parsePosters(value: unknown): Record<string, TestimonialPoster> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const posters: Record<string, TestimonialPoster> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!key) continue;
    if (typeof entry === "string" && entry.length > 0) {
      posters[key] = { url: entry, focusX: 50, focusY: 50, scale: 1 };
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.url !== "string" || record.url.length === 0) continue;
    posters[key] = {
      url: record.url,
      focusX: clampFocus(record.focusX),
      focusY: clampFocus(record.focusY),
      scale: clampScale(record.scale),
    };
  }
  return posters;
}

export async function getTestimonialOrderKeys() {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  return parseKeys(record?.keys);
}

export async function getTestimonialPosters() {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  return parsePosters(record?.posters);
}

export async function saveTestimonialOrderKeys(keys: string[]) {
  const saved = await prisma.testimonialOrder.upsert({
    where: { id: "default" },
    create: { id: "default", keys: keys as Prisma.InputJsonValue },
    update: { keys: keys as Prisma.InputJsonValue },
  });
  return parseKeys(saved.keys);
}

async function savePosters(
  posters: Record<string, TestimonialPoster>,
  existingKeys?: string[]
) {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  const keys = existingKeys ?? parseKeys(record?.keys);
  await prisma.testimonialOrder.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      keys: keys as Prisma.InputJsonValue,
      posters: posters as unknown as Prisma.InputJsonValue,
    },
    update: { posters: posters as unknown as Prisma.InputJsonValue },
  });
}

export async function setTestimonialPoster(
  videoKey: string,
  posterUrl: string | null,
  focus?: PosterFocus | null
) {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  const posters = parsePosters(record?.posters);
  const previous = posters[videoKey] ?? null;

  if (posterUrl) {
    posters[videoKey] = {
      url: posterUrl,
      focusX: clampFocus(focus?.x, previous?.focusX ?? 50),
      focusY: clampFocus(focus?.y, previous?.focusY ?? 50),
      scale: clampScale(focus?.scale, previous?.scale ?? 1),
    };
  } else {
    delete posters[videoKey];
  }

  await savePosters(posters, record ? parseKeys(record.keys) : []);

  if (previous?.url && previous.url !== posterUrl) {
    await deleteImageByUrl(previous.url, "testimonial-posters");
  }

  return posters[videoKey] ?? null;
}

export async function removeFromTestimonialOrder(key: string) {
  const record = await prisma.testimonialOrder.findUnique({ where: { id: "default" } });
  const keys = parseKeys(record?.keys);
  const posters = parsePosters(record?.posters);
  const poster = posters[key] ?? null;
  const nextKeys = keys.filter((item) => item !== key);
  const nextPosters = { ...posters };
  delete nextPosters[key];

  if (keys.includes(key) || poster) {
    await prisma.testimonialOrder.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        keys: nextKeys as Prisma.InputJsonValue,
        posters: nextPosters as unknown as Prisma.InputJsonValue,
      },
      update: {
        keys: nextKeys as Prisma.InputJsonValue,
        posters: nextPosters as unknown as Prisma.InputJsonValue,
      },
    });
  }

  if (poster?.url) {
    await deleteImageByUrl(poster.url, "testimonial-posters");
  }
}

export async function listTestimonialItems(): Promise<TestimonialItem[]> {
  if (!isS3Configured()) return [];
  const [images, orderedKeys, posters] = await Promise.all([
    listImages("testimonials"),
    getTestimonialOrderKeys(),
    getTestimonialPosters(),
  ]);
  const ordered = orderedKeys.length === 0 ? images : applyGalleryOrder(images, orderedKeys);
  return ordered.map((image) => {
    const poster = image.type === "video" ? posters[image.key] : undefined;
    return {
      ...image,
      posterUrl: poster?.url ?? null,
      posterFocusX: poster?.focusX ?? null,
      posterFocusY: poster?.focusY ?? null,
      posterScale: poster?.scale ?? null,
    };
  });
}

export function isTestimonialVideoKey(key: string) {
  return mediaTypeFromKey(key) === "video";
}
