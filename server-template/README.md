# Shor Server

A standalone local JSON database server for the [Shor](https://github.com/shorjson) link shortener.
**Zero npm dependencies** — pure Node.js 18+. Runs on Windows, macOS, and Linux.

## Quick Start

```bash
node server.js
```

The server starts on **port 4000** and opens the dashboard in your browser automatically.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--port <n>` | `4000` | Port to listen on |
| `--no-browser` | — | Don't open the browser on start |
| `--db <path>` | `./links.json` | Path to the JSON database file |

Environment variable `PORT=<n>` also works.

```bash
node server.js --port 5000
node server.js --no-browser
PORT=8080 node server.js
```

## Connect to Shor

1. Start this server: `node server.js`
2. Open the Shor app in your browser
3. Click the **⚙ Settings** icon (top right)
4. Enter `http://localhost:4000` as your server URL
5. Click **Connect**

All new links will now be stored in your local `links.json`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + stats |
| `GET` | `/api/links` | List all links |
| `GET` | `/api/links/:id` | Get one link |
| `POST` | `/api/links` | Create a short link |
| `DELETE` | `/api/links/:id` | Delete a link |
| `GET` | `/api/db/export` | Download `links.json` |
| `POST` | `/api/db/import` | Import a `links.json` file |

### Create a link (curl example)

```bash
curl -X POST http://localhost:4000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-long-url.com/path", "slug": "my-link"}'
```

## Data

Links are stored in `links.json` next to `server.js` by default.