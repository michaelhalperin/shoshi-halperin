import type { RequestHandler } from "express";

/** Cache-Control for public read endpoints (CDN/browser). */
export function publicCache(maxAgeSeconds: number): RequestHandler {
  return (_req, res, next) => {
    res.set(
      "Cache-Control",
      `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${Math.min(maxAgeSeconds, 60)}`
    );
    next();
  };
}
