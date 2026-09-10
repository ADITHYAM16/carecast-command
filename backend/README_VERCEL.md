# CareCast AI — Backend Vercel Deployment

## How it works

`vercel.json` maps every request (`/.*`) to `main.py`.
Vercel's `@vercel/python` runtime detects the `app` FastAPI object and
serves it as a serverless function.

---

## Step 1 — Push the repo to GitHub

Make sure the full repo (including `backend/`) is pushed to GitHub.

---

## Step 2 — Import project in Vercel dashboard

1. Go to https://vercel.com/new
2. Click **Import Git Repository** and select your repo.

---

## Step 3 — Set Root Directory

In the **Configure Project** screen:

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Framework Preset** | Other |
| **Build Command** | *(leave blank)* |
| **Output Directory** | *(leave blank)* |
| **Install Command** | `pip install -r requirements.txt` |

> Vercel will look for `vercel.json` inside `backend/` and use it automatically.

---

## Step 4 — Add Environment Variables

In **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `MONGO_URI` | `mongodb+srv://carecast:<password>@healthcare.cm1yqbb.mongodb.net/?appName=Healthcare&tlsAllowInvalidCertificates=true` |
| `MONGO_DB` | `healthcare` |
| `FRONTEND_ORIGIN` | `https://your-frontend.vercel.app` *(set after frontend is deployed)* |

> Do **not** commit `.env` to git. The values above replace it in production.

---

## Step 5 — Deploy

Click **Deploy**. Vercel will:
1. Install `requirements.txt`
2. Bundle `main.py` + `services/` + `data/` as a serverless function
3. Route all HTTP requests through FastAPI

---

## Step 6 — Update frontend API URL

In your frontend repo, set the environment variable:

```
VITE_API_URL=https://your-backend.vercel.app
```

Or update `src/services/api.ts`:
```ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "https://your-backend.vercel.app";
```

---

## Notes

- Vercel serverless functions have a **10s timeout** on the Hobby plan (60s on Pro).
  Heavy endpoints like `/api/forecast` may need the Pro plan.
- The `data/` CSV files are bundled into the function at deploy time (read-only).
- File uploads (`/api/data/upload`) write to `/tmp` on Vercel — files are ephemeral.
- MongoDB Atlas is used for persistent emergency case storage.
