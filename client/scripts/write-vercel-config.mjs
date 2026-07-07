import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const apiUrl = (process.env.API_URL ?? "https://mom-course-api.onrender.com").replace(/\/$/, "");
const root = dirname(fileURLToPath(import.meta.url));

writeFileSync(
  join(root, "..", "vercel.json"),
  `${JSON.stringify(
    {
      buildCommand: "npm run build",
      outputDirectory: "dist",
      rewrites: [
        { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
        { source: "/(.*)", destination: "/index.html" },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(`vercel.json: /api/* → ${apiUrl}`);
