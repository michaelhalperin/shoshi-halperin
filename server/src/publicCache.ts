import type { RequestHandler } from "express";

/** Cache-Control for public read endpoints (CDN/browser). */
export function publicCache(maxAgeSeconds: number): RequestHandler {
  return (req, res, next) => {
    // Admin list views (?all=1) must never be cached — mutations would look like no-ops.
    if (req.query.all === "1") {
      res.set("Cache-Control", "private, no-store");
    } else {
      res.set(
        "Cache-Control",
        `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${Math.min(maxAgeSeconds, 60)}`
      );
    }
    next();
  };
}
