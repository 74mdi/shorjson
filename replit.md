# shorjson — URL Shortener

A Next.js 16 URL shortener app with optional database support.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS
- **Storage**: File-based (`data/links.json`) by default; supports MongoDB, PostgreSQL, MySQL, SQLite, Redis via env vars
- **Package manager**: npm

## Running the App

```bash
npm run dev    # development (port 5000)
npm run build  # production build
npm start      # production server (port 5000)
```

The workflow "Start application" runs `npm run dev` and is configured to listen on port 5000.

## Environment Variables

All optional — the app works without a database using local file storage:

| Variable | Description |
|---|---|
| `DATABASE_TYPE` | `mongodb` \| `postgresql` \| `mysql` \| `sqlite` \| `redis` |
| `DATABASE_URL` | Full connection string for the chosen database |
| `REMOTE_SERVER_URL` | URL of a self-hosted shor-server instance |

See `.env.example` for example values.

## Project Structure

```
app/             Next.js App Router pages & API routes
components/      React UI components
lib/             Server-side logic (storage, DB adapter, config)
data/            Local JSON storage (auto-created, gitignored)
server-template/ Downloadable self-host server template
```

## Replit-Specific Changes

- Dev/start scripts updated to bind `0.0.0.0` on port 5000
- `allowedDevOrigins` in `next.config.js` set to `REPLIT_DEV_DOMAIN` to allow HMR through the proxy
