import { Router } from "express";
import multer from "multer";
import { isS3Configured, MAX_UPLOAD_SIZE, UPLOAD_FOLDERS, uploadFile, type UploadFolder } from "../s3.js";

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
});

uploadsRouter.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "File must be 100 MB or smaller" : err.message;
      return res.status(400).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({ error: "Image storage is not configured" });
  }

  const folder = req.body?.folder;
  if (!UPLOAD_FOLDERS.includes(folder)) {
    return res.status(400).json({ error: "Invalid upload folder" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  try {
    const result = await uploadFile(folder as UploadFolder, req.file);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(400).json({ error: message });
  }
});
