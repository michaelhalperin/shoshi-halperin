import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

export const UPLOAD_FOLDERS = [
  "courses",
  "recipes",
  "gallery",
  "testimonials",
  "testimonial-posters",
  "about",
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_UPLOAD_SIZE = MAX_VIDEO_SIZE;

export type MediaType = "image" | "video";

const region = process.env.AWS_REGION ?? "eu-north-1";
const bucket = process.env.AWS_S3_BUCKET ?? "";
const publicBaseUrl = (process.env.AWS_S3_PUBLIC_URL ?? "").replace(/\/$/, "");

let client: S3Client | null = null;

export function isS3Configured() {
  return Boolean(
    bucket &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      publicBaseUrl
  );
}

function getClient() {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured");
  }
  if (!client) {
    client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function mediaTypeFromMime(mime: string): MediaType | null {
  if (IMAGE_MIME_TYPES.has(mime)) return "image";
  if (VIDEO_MIME_TYPES.has(mime)) return "video";
  return null;
}

export function mediaTypeFromKey(key: string): MediaType {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "mp4" || ext === "webm" || ext === "mov") return "video";
  return "image";
}

export function validateImageFile(file: Express.Multer.File) {
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be 5 MB or smaller");
  }
}

export function validateGalleryFile(file: Express.Multer.File) {
  const type = mediaTypeFromMime(file.mimetype);
  if (!type) {
    throw new Error("Only JPEG, PNG, WebP, GIF images and MP4, WebM, or MOV videos are allowed");
  }
  const maxSize = type === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    throw new Error(type === "video" ? "Video must be 100 MB or smaller" : "Image must be 5 MB or smaller");
  }
}

function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

export function publicUrlForKey(key: string) {
  return `${publicBaseUrl}/${key}`;
}

export async function uploadFile(folder: UploadFolder, file: Express.Multer.File) {
  if (folder === "gallery" || folder === "testimonials") {
    validateGalleryFile(file);
  } else {
    validateImageFile(file);
  }
  const ext = extensionForMime(file.mimetype);
  const key = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const type = mediaTypeFromMime(file.mimetype) ?? "image";

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { key, url: publicUrlForKey(key), type };
}

export async function listImages(folder: UploadFolder) {
  const prefix = `${folder}/`;
  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
  );

  return (response.Contents ?? [])
    .filter((item) => item.Key && !item.Key.endsWith("/"))
    .map((item) => ({
      key: item.Key!,
      url: publicUrlForKey(item.Key!),
      type: mediaTypeFromKey(item.Key!),
      lastModified: item.LastModified?.toISOString() ?? null,
    }))
    .sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));
}

export async function deleteImage(key: string, folder: UploadFolder) {
  if (!key.startsWith(`${folder}/`)) {
    throw new Error("Invalid image key");
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/** Extract an S3 object key from a stored public URL, if it belongs to this bucket. */
export function keyFromPublicUrl(url: string): string | null {
  if (!publicBaseUrl || !url.startsWith(`${publicBaseUrl}/`)) {
    return null;
  }
  return url.slice(publicBaseUrl.length + 1);
}

/** Delete an uploaded image by its public URL. No-op for external URLs or when S3 is not configured. */
export async function deleteImageByUrl(url: string | null | undefined, folder: UploadFolder) {
  if (!url || !isS3Configured()) return;
  const key = keyFromPublicUrl(url);
  if (!key || !key.startsWith(`${folder}/`)) return;
  await deleteImage(key, folder);
}
