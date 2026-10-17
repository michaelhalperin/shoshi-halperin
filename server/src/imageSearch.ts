import { isS3Configured, uploadImageBuffer, type UploadFolder } from "./s3.js";

export type FoundImage = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

type UnsplashSearchResponse = {
  results?: Array<{
    id: string;
    urls?: { small?: string; regular?: string };
    links?: { download_location?: string };
    user?: { name?: string; links?: { html?: string } };
  }>;
  errors?: string[];
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isImageSearchConfigured(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

function unsplashHeaders() {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) throw new Error("Image search is not configured");
  return { Authorization: `Client-ID ${key}` };
}

/** Build progressively simpler food-photo queries from a recipe title. */
function buildSearchQueries(title: string): string[] {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const withoutOnClause = cleaned.replace(/\s+on\s+.+$/i, "").trim();
  const withoutWithClause = cleaned.replace(/\s+with\s+.+$/i, "").trim();
  const words = cleaned.split(" ").filter(Boolean);
  const firstThree = words.slice(0, 3).join(" ");
  const firstTwo = words.slice(0, 2).join(" ");

  const candidates = [
    `${cleaned} food`,
    cleaned,
    withoutOnClause ? `${withoutOnClause} food` : "",
    withoutOnClause,
    withoutWithClause ? `${withoutWithClause} food` : "",
    withoutWithClause,
    firstThree ? `${firstThree} food` : "",
    firstThree,
    firstTwo ? `${firstTwo} food` : "",
    firstTwo,
  ];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const candidate of candidates) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate.trim());
  }
  return unique;
}

async function searchUnsplashOnce(
  query: string,
  options: { orientation?: "landscape" | "portrait" | "squarish" } = { orientation: "landscape" }
): Promise<FoundImage[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "15");
  url.searchParams.set("content_filter", "high");
  if (options.orientation) {
    url.searchParams.set("orientation", options.orientation);
  }

  const response = await fetch(url, { headers: unsplashHeaders() });
  const data = (await response.json()) as UnsplashSearchResponse;

  if (!response.ok) {
    throw new Error(data.errors?.[0] ?? "Image search failed");
  }

  return (data.results ?? [])
    .map((photo) => {
      if (!photo.id || !photo.urls?.small || !photo.urls?.regular || !photo.links?.download_location) {
        return null;
      }
      return {
        id: photo.id,
        thumbUrl: photo.urls.small,
        fullUrl: photo.urls.regular,
        downloadLocation: photo.links.download_location,
        photographer: photo.user?.name?.trim() || "Unsplash",
        photographerUrl: photo.user?.links?.html?.trim() || "https://unsplash.com",
      } satisfies FoundImage;
    })
    .filter((photo): photo is FoundImage => Boolean(photo));
}

export async function searchWebImages(query: string): Promise<FoundImage[]> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Search query is empty");

  const candidates = buildSearchQueries(trimmed);

  for (const candidate of candidates) {
    const results = await searchUnsplashOnce(candidate);
    if (results.length > 0) return results;
  }

  // Last resort: same simplified queries without orientation filter.
  for (const candidate of candidates.slice(0, 6)) {
    const results = await searchUnsplashOnce(candidate, { orientation: undefined });
    if (results.length > 0) return results;
  }

  return [];
}

async function triggerUnsplashDownload(downloadLocation: string) {
  try {
    await fetch(downloadLocation, { headers: unsplashHeaders() });
  } catch (err) {
    console.warn("Failed to trigger Unsplash download tracking:", err);
  }
}

function mimeFromContentType(contentType: string | null): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (IMAGE_MIME_TYPES.has(mime)) return mime;
  return "image/jpeg";
}

export async function importWebImage(options: {
  imageUrl: string;
  downloadLocation?: string;
  folder: UploadFolder;
}): Promise<{ url: string }> {
  if (options.downloadLocation) {
    await triggerUnsplashDownload(options.downloadLocation);
  }

  const response = await fetch(options.imageUrl);
  if (!response.ok) {
    throw new Error("Failed to download selected image");
  }

  const mimetype = mimeFromContentType(response.headers.get("content-type"));
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isS3Configured()) {
    const uploaded = await uploadImageBuffer(options.folder, buffer, mimetype);
    return { url: uploaded.url };
  }

  // Fall back to hotlinking the Unsplash CDN URL when S3 is unavailable.
  return { url: options.imageUrl };
}
