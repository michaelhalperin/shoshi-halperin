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

| Email | Password |
| ----- | -------- |
| Glamiquefr@gmail.com | `123456789` |

Log in via the small "Admin" link in the footer (or `/login`). Use **Forgot password?** anytime to change your password.

Password reset emails are sent via [Resend](https://resend.com). Configure on Render:

| Variable | Purpose |
| -------- | ------- |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Verified sender, e.g. `Shoshi Halperin <noreply@yourdomain.com>` |

## What's included

**Visitor side (no login needed)**

- Browse active courses (bilingual content, photos)
- View available time slots with live remaining capacity
- Book a slot by leaving name, phone, and email (confirmation email sent)
- Duplicate bookings (same phone, same slot) are rejected

**Admin side** (`/admin`)

- Dashboard with stats and upcoming appointments
- Courses: create / edit / hide / delete (English + Hebrew fields, price, duration, photo upload, card color)
- Recipes: create / edit / hide / delete with photo upload
- Gallery: upload / delete photos (stored in S3, shown on `/gallery`)
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

The build runs migrations (`db push`) and seeds sample data on each deploy. Set `RESEND_API_KEY` on Render so the admin can reset their password.

### 2. Deploy the site on Vercel

1. In [Vercel](https://vercel.com), import the same GitHub repo.
2. Vercel picks up `client/vercel.json` automatically (builds `client/`, serves `client/dist`).
3. Under **Settings → Environment Variables**, add:
   - `API_URL` = your Render API URL (no trailing slash), e.g. `https://mom-course-api.onrender.com`  
     This proxies `/api/*` through your Vercel domain so admin login cookies work on mobile Safari.
4. **Do not set `VITE_API_URL` on Vercel** — production uses same-origin `/api` requests.
5. Redeploy so the proxy and env var are applied.

### 3. Verify

- Visit your Vercel URL on a phone — courses and booking should load.
- Log in at `/login`, reload the page — you should stay logged in.
- If the site loads but API calls fail, check `API_URL` on Vercel matches your Render service URL.

### Environment variables

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `DATABASE_URL` | Render (auto) | Postgres connection string |
| `JWT_SECRET` | Render (auto-generated) | Signs admin session cookies |
| `CLIENT_URL` | Render | Allowed CORS origin(s), comma-separated |
| `NODE_ENV` | Render | Set to `production` in `render.yaml` |
| `API_URL` | Vercel | Render API URL — Vercel proxies `/api/*` to this host |
| `VITE_API_URL` | Local only | Optional override for local dev; leave unset on Vercel |
| `AWS_REGION` | Render | S3 bucket region (e.g. `eu-north-1`) |
| `AWS_S3_BUCKET` | Render | S3 bucket name |
| `AWS_S3_PUBLIC_URL` | Render | Public base URL for uploaded images |
| `AWS_ACCESS_KEY_ID` | Render | IAM user access key for S3 uploads |
| `AWS_SECRET_ACCESS_KEY` | Render | IAM user secret key for S3 uploads |
| `RESEND_API_KEY` | Render | Resend API key for password reset emails |
| `RESEND_FROM` | Render | Verified sender address in Resend |

Local copies: `server/.env.example`, `client/.env.example`.
