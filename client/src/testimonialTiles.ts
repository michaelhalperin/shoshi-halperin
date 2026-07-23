import type { CSSProperties } from "react";

/** Mosaic layouts for the public testimonials grid (md: 4 columns). */
export const TESTIMONIAL_TILE_LAYOUTS = [
  "col-span-2 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
] as const;

/** Below 1 = fit entire image in the tile (object-fit: contain). */
export const POSTER_SCALE_MIN = 0.5;
export const POSTER_SCALE_MAX = 3;
export const POSTER_SCALE_STEP = 0.1;

export function testimonialTileLayout(index: number) {
  return TESTIMONIAL_TILE_LAYOUTS[index % TESTIMONIAL_TILE_LAYOUTS.length];
}

export function clampFocus(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function clampScale(value: number) {
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return POSTER_SCALE_MIN;
  const clamped = Math.min(POSTER_SCALE_MAX, Math.max(1, value));
  return Math.round(clamped * 100) / 100;
}

export function isPosterFit(scale?: number | null) {
  return clampScale(scale ?? 1) < 1;
}

export function nudgePosterScale(current: number, delta: number) {
  if (delta < 0) {
    if (current <= 1) return POSTER_SCALE_MIN;
    const next = current + delta;
    return next < 1 ? 1 : clampScale(next);
  }
  if (current < 1) return 1;
  return clampScale(current + delta);
}

export function posterFrameStyle(
  focusX?: number | null,
  focusY?: number | null,
  scale?: number | null
): CSSProperties {
  const x = clampFocus(focusX ?? 50);
  const y = clampFocus(focusY ?? 50);
  const zoom = clampScale(scale ?? 1);
  const fit = zoom < 1;

  if (fit) {
    return {
      objectFit: "contain",
      objectPosition: `${x}% ${y}%`,
      transform: "none",
      transformOrigin: `${x}% ${y}%`,
    };
  }

  return {
    objectFit: "cover",
    objectPosition: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** @deprecated Use posterFrameStyle */
export function objectPositionStyle(focusX?: number | null, focusY?: number | null) {
  return posterFrameStyle(focusX, focusY, 1);
}
