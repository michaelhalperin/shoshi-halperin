# Shoshi Halperin — Course Appointments

A full-stack course appointment booking website. Visitors book without an account;
only the admin logs in. English + Hebrew (RTL) with a language toggle, fully
responsive for phone/tablet/desktop.

## Tech stack

- **Client:** React + Vite + TypeScript, Tailwind CSS, React Router
- **Server:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth (admin only):** JWT in an httpOnly cookie, bcrypt password hashing

## Getting started

```bash
npm install
docker compose up -d          # local Postgres on port 5432
cp server/.env.example server/.env
npm run db:setup              # creates tables and seeds sample data
npm run dev                   # starts API (http://localhost:3000) + site (http://localhost:5173)
```

Then open **http://localhost:5173**.

### Admin account

| Email             | Password |
| ----------------- | -------- |
| admin@example.com | admin123 |

Log in via the small "Admin" link in the footer (or `/login`).
Change this password before going live (edit `server/prisma/seed.ts` and reseed).

## What's included

**Visitor side (no login needed)**

- Browse active courses (bilingual content, photos)
- View available time slots with live remaining capacity
- Book a slot by leaving name + phone (email optional)
- Duplicate bookings (same phone, same slot) are rejected

**Admin side** (`/admin`)

- Dashboard with stats and upcoming appointments
- Courses: create / edit / hide / delete (English + Hebrew fields, price, duration, photo URL, card color)
- Time slots: create / edit / delete, per-slot capacity, filter by course
- Bookings: view all with visitor contact details, cancel

## Project structure

```
client/         React app (Vite) — deployed to Vercel
server/         Express API + Prisma — deployed to Render
render.yaml     Render blueprint (API + Postgres)
vercel.json     Vercel build + SPA routing
```

## Deployment (Vercel + Render)

Frontend on **Vercel**, API + database on **Render**.

### 1. Deploy the API on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com), choose **New → Blueprint** and connect the repo.
3. Render reads `render.yaml` and creates:
   - a **PostgreSQL** database (`mom-course-db`)
   - a **Web Service** (`mom-course-api`)
4. After the first deploy, open the web service → **Environment** and set:
   - `CLIENT_URL` — your Vercel site URL (e.g. `https://your-app.vercel.app`). Add a custom domain later as a comma-separated list if needed.
5. Copy the API URL (e.g. `https://mom-course-api.onrender.com`).

The build runs migrations (`db push`) and seeds sample data on each deploy. Change the admin password in `server/prisma/seed.ts` before your first production deploy.

### 2. Deploy the site on Vercel

1. In [Vercel](https://vercel.com), import the same GitHub repo.
2. Vercel picks up `vercel.json` automatically (builds `client/`, serves `client/dist`).
3. Under **Settings → Environment Variables**, add:
   - `VITE_API_URL` = your Render API URL (no trailing slash), e.g. `https://mom-course-api.onrender.com`
4. Redeploy so the env var is baked into the client build.

### 3. Verify

- Visit your Vercel URL — courses and booking should load.
- Log in at `/login` with the admin account.
- If the site loads but API calls fail, check `CLIENT_URL` on Render matches your Vercel URL exactly (including `https://`).

### Environment variables

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `DATABASE_URL` | Render (auto) | Postgres connection string |
| `JWT_SECRET` | Render (auto-generated) | Signs admin session cookies |
| `CLIENT_URL` | Render | Allowed CORS origin(s), comma-separated |
| `NODE_ENV` | Render | Set to `production` in `render.yaml` |
| `VITE_API_URL` | Vercel | Render API base URL for the React app |

Local copies: `server/.env.example`, `client/.env.example`.
