# Deploying Shor

Shor is a stateless Next.js app. **Local JSON storage** works perfectly in development and on self-hosted servers. Vercel's serverless environment requires an **external database** because its filesystem is read-only between requests.

---

## ⚡ Quick deploy to Vercel

1. Push this repo to GitHub (see below)
2. Go to **[vercel.com/new](https://vercel.com/new)** → import your repository
3. Add the [environment variables](#environment-variables)
4. Click **Deploy**

---

## Prerequisites

| Tool | Notes |
|------|-------|
| Node.js ≥ 18 | `node --version` |
| A GitHub account | [github.com](https://github.com) |
| A Vercel account (free) | [vercel.com](https://vercel.com) |
| An external database | See options below |

---

## Database options

### MongoDB Atlas (recommended — free tier)

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a **free M0 cluster** (no credit card needed)
3. **Database Access** → Add user with read+write privileges
4. **Network Access** → Add IP `0.0.0.0/0` (allows all Vercel IPs)
5. **Connect** → Drivers → copy the connection string

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shor
```

### Neon — serverless PostgreSQL (generous free tier)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the connection string

```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Supabase — open-source PostgreSQL

1. Sign up at [supabase.com](https://supabase.com)
2. New project → Settings → Database → Connection string (URI mode)

### Railway — one-click PostgreSQL or MongoDB

1. Sign up at [railway.app](https://railway.app)
2. New project → Add PostgreSQL (or MongoDB)
3. Variables tab → copy `DATABASE_URL`

---

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

| Variable | Required on Vercel | Description |
|----------|--------------------|-------------|
| `DATABASE_TYPE` | ✅ | `mongodb` or `postgresql` |
| `DATABASE_URL` | ✅ | Full connection string |
| `REMOTE_SERVER_URL` | No | URL of a self-hosted shor-server |

### MongoDB example
```
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/shor
```

### PostgreSQL example
```
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

> **Local `.env.local`** — copy `.env.example` to `.env.local` and fill in the values to test with a real database locally.

---

## Step-by-step Vercel deployment

### 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kokosho.git
git push -u origin main
```

### 2 — Import to Vercel

1. Visit [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your **kokosho** repo
4. Vercel auto-detects Next.js — no build config needed

### 3 — Add environment variables

In the import dialog (or later in Settings):

```
DATABASE_TYPE   =  mongodb
DATABASE_URL    =  mongodb+srv://...
```

### 4 — Deploy

Click **Deploy**. Vercel builds and deploys in ~1 minute.  
Your app is live at `https://kokosho.vercel.app` (or a custom domain).

### 5 — Verify

- Visit `/` → shorten a URL → click it → should redirect ✅
- Visit `/notes` → create a note → reload → note persists ✅

---

## Self-hosting (no Vercel)

Run on any Linux server, Raspberry Pi, or VPS:

```bash
git clone https://github.com/YOUR_USERNAME/kokosho.git
cd kokosho
npm install
npm run build
npm start           # production server on :3000
```

- No environment variables needed — data lives in `data/` as local JSON files
- To use an external database, add `DATABASE_URL` + `DATABASE_TYPE` to your environment

### With PM2 (keep alive on reboot)

```bash
npm install -g pm2
pm2 start npm --name "shor" -- start
pm2 save
pm2 startup
```

### With Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production=false
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t kokosho .
docker run -p 3000:3000 -v $(pwd)/data:/app/data kokosho
```

> Mount `./data` so your links and notes persist across container restarts.

---

## Local development

```bash
npm install
npm run dev        # hot-reload dev server at http://localhost:3000
```

No database needed — data is stored in `data/links.json` and `data/notes.json`.  
To test with a real database, create `.env.local`:

```bash
cp .env.example .env.local
# edit .env.local with your credentials
```

---

## The shor-server (standalone local DB)

A zero-dependency Node.js server you can run on any machine:

1. In the Shor UI → Settings (⊙) → **Download Server Files (.zip)**
2. Extract the ZIP, then:

```bash
node server.js                     # starts on :4000, opens browser
node server.js --port 5000         # custom port
node server.js --no-browser        # headless
```

3. In Shor Settings → enter `http://localhost:4000` → **Connect**

All links and notes now sync to the server's `links.json`.  
Full API docs: `server-template/README.md`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Data doesn't persist on Vercel | Set `DATABASE_URL` + `DATABASE_TYPE` env vars |
| `MongoServerSelectionError` | Add `0.0.0.0/0` to MongoDB Atlas Network Access |
| PostgreSQL SSL error | Append `?sslmode=require` to your connection string |
| `Could not reach remote server` | Ensure `shor-server` is running and the URL is reachable |
| Build fails on Vercel | Check Node.js version is ≥ 18 in Vercel project settings |
| 308 redirect loops | Verify `DATABASE_URL` is correct and DB is accessible |

---

## Project structure

```
kokosho/
├── app/                    # Next.js App Router pages + API routes
│   ├── page.tsx            # Link shortener home
│   ├── notes/page.tsx      # Notes page
│   └── api/                # All API routes
├── components/             # React client components
├── lib/                    # Storage, DB adapters, config
│   ├── storage.ts          # Local JSON storage (links)
│   ├── notes-storage.ts    # Local JSON storage (notes)
│   ├── db-adapter.ts       # MongoDB + PostgreSQL adapters
│   ├── adapter-utils.ts    # Unified async storage API
│   └── db-connections.ts   # Saved DB connection configs
├── server-template/        # Standalone shor-server (download via UI)
├── data/                   # Runtime data — gitignored
│   ├── links.json
│   ├── notes.json
│   └── db-connections.json
├── .env.example            # Copy to .env.local for local DB testing
└── DEPLOY.md               # This file
```

---

*Made with Next.js 16 · Deployed with Vercel · MIT License*