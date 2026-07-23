import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { bookingsRouter } from "./routes/bookings.js";
import { couponsRouter } from "./routes/coupons.js";
import { coursesRouter } from "./routes/courses.js";
import { aboutRouter } from "./routes/about.js";
import { galleryRouter } from "./routes/gallery.js";
import { recipesRouter } from "./routes/recipes.js";
import { shopLinksRouter } from "./routes/shopLinks.js";
import { slotsRouter } from "./routes/slots.js";
import { testimonialsRouter } from "./routes/testimonials.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

const clientOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/shop-links", shopLinksRouter);
app.use("/api/slots", slotsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/about", aboutRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`CORS allowed origins: ${clientOrigins.join(", ") || "(none)"}`);
});
