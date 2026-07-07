import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

export const UPLOAD_FOLDERS = ["courses", "recipes", "gallery", "about"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export function validateImageFile(file: Express.Multer.File) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be 5 MB or smaller");
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
    default:
      return "bin";
  }
}

export function publicUrlForKey(key: string) {
  return `${publicBaseUrl}/${key}`;
}

export async function uploadImage(folder: UploadFolder, file: Express.Multer.File) {
  validateImageFile(file);
  const ext = extensionForMime(file.mimetype);
  const key = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { key, url: publicUrlForKey(key) };
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
