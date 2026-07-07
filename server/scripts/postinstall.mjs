import { execSync } from "node:child_process";

// Vercel installs the monorepo for client-only deploys — Prisma isn't needed there.
if (process.env.VERCEL) process.exit(0);

execSync("npx prisma generate", { stdio: "inherit" });
