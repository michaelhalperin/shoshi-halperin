export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Production uses same-origin /api (proxied by Vercel) so auth cookies work on mobile Safari.
const API_BASE = import.meta.env.PROD
  ? ""
  : ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "");

const REQUEST_TIMEOUT_MS = 60_000;
const GET_CACHE_TTL_MS = 60_000;

type CacheEntry = { data: unknown; expiresAt: number };
const getCache = new Map<string, CacheEntry>();

function isCacheableGet(path: string) {
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/auth")) return false;
  if (path.startsWith("/api/admin")) return false;
  if (path.startsWith("/api/bookings")) return false;
  if (path.includes("all=1")) return false;
  return true;
}

function getCachedGet<T>(path: string): T | undefined {
  const entry = getCache.get(path);
  if (!entry || Date.now() > entry.expiresAt) {
    getCache.delete(path);
    return undefined;
  }
  return entry.data as T;
}

function setCachedGet(path: string, data: unknown) {
  getCache.set(path, { data, expiresAt: Date.now() + GET_CACHE_TTL_MS });
}

function invalidateGetCache() {
  getCache.clear();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET") invalidateGetCache();

  if (method === "GET" && isCacheableGet(path)) {
    const cached = getCachedGet<T>(path);
    if (cached !== undefined) return cached;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      signal: controller.signal,
      // Bypass HTTP cache for admin/auth lists so save/delete updates show immediately.
      cache: method === "GET" && !isCacheableGet(path) ? "no-store" : undefined,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error ?? "Request failed");
    if (method === "GET" && isCacheableGet(path)) {
      setCachedGet(path, data);
    }
    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, formData: FormData) => {
    invalidateGetCache();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, data.error ?? "Upload failed");
      return data as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(0, "Request timed out");
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  },
  deleteWithQuery: <T>(path: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<T>(`${path}?${query}`, { method: "DELETE" });
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mustSetPassword?: boolean;
}

export interface Course {
  id: string;
  titleEn: string;
  titleHe: string;
  descriptionEn: string;
  descriptionHe: string;
  price: number;
  customPrice: boolean;
  durationMin: number;
  maxParticipants: number;
  imageUrl?: string | null;
  color: string;
  active: boolean;
  _count?: { slots: number };
}

export interface Recipe {
  id: string;
  titleEn: string;
  titleHe: string;
  descriptionEn: string;
  descriptionHe: string;
  ingredientsEn?: string;
  ingredientsHe?: string;
  stepsEn?: string;
  stepsHe?: string;
  imageUrl?: string | null;
  color: string;
  active: boolean;
  courseId?: string | null;
  course?: { id: string; titleEn: string; titleHe: string } | null;
}

export interface Slot {
  id: string;
  courseId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  course?: { id: string; titleEn: string; titleHe: string };
}

export interface Booking {
  id: string;
  status: string;
  createdAt: string;
  name: string;
  phone: string;
  email?: string | null;
  couponCode?: string | null;
  originalPrice?: number | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  slot: Slot & { course: Course };
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  courseId: string | null;
  course?: { id: string; titleEn: string; titleHe: string } | null;
  _count?: { bookings: number };
}

export interface CouponValidation {
  valid: true;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface GalleryImage {
  key: string;
  url: string;
  type: "image" | "video";
  lastModified: string | null;
  posterUrl?: string | null;
  posterFocusX?: number | null;
  posterFocusY?: number | null;
  posterScale?: number | null;
}

export type UploadFolder =
  | "courses"
  | "recipes"
  | "gallery"
  | "gallery-posters"
  | "testimonials"
  | "testimonial-posters"
  | "about";

export interface AboutContent {
  id: string;
  titleEn: string;
  titleHe: string;
  introEn: string;
  introHe: string;
  paragraphsEn: string[];
  paragraphsHe: string[];
  updatedAt?: string;
}

export interface ShopLink {
  id: string;
  titleEn: string;
  titleHe: string;
  categoryEn: string;
  categoryHe: string;
  shopName: string;
  productUrl: string;
  imageUrl?: string | null;
  price?: number | null;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  attributedUrl?: string;
}
