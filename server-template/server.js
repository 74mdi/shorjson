#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ─────────────────────────────────────────────────────────────────────────────
//  Shor Server  v1.0.0
//  Single-file Node.js 18+ HTTP link-shortener server
//  Zero npm dependencies  |  Embedded web dashboard
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const VERSION        = '1.0.0';
const SERVER_START_MS = Date.now();

// ── CLI / Config ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  return (i !== -1 && args[i + 1] !== undefined) ? args[i + 1] : null;
}

const PORT       = parseInt(getArg('--port') || process.env.PORT || '4000', 10);
const NO_BROWSER = args.includes('--no-browser');
const DB_FILE    = path.resolve(getArg('--db') || './links.json');

// ── ANSI Color Codes ──────────────────────────────────────────────────────────

const C = {
  reset   : '\x1b[0m',
  dim     : '\x1b[2m',
  bold    : '\x1b[1m',
  cyan    : '\x1b[36m',
  green   : '\x1b[32m',
  red     : '\x1b[31m',
  magenta : '\x1b[35m',
};

// ── Database ──────────────────────────────────────────────────────────────────

/**
 * Read the links database from disk.
 * Returns a plain object: { [shortId]: originalUrl }
 * @returns {{ [key: string]: string }}
 */
function dbRead() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Persist the links database to disk (pretty-printed).
 * @param {{ [key: string]: string }} data
 */
function dbWrite(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── ID Generation ─────────────────────────────────────────────────────────────

const ID_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH  = 7;

/** Generate a single random ID using crypto.randomBytes + custom charset. */
function generateId() {
  const bytes  = crypto.randomBytes(ID_LENGTH);
  let   result = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    result += ID_CHARSET[bytes[i] % ID_CHARSET.length];
  }
  return result;
}

/**
 * Generate a unique ID that is not already present in the DB.
 * Retries up to 20 times before throwing.
 * @param {{ [key: string]: string }} db
 */
function uniqueId(db) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generateId();
    if (!db[id]) return id;
  }
  throw new Error('Unable to generate a unique ID after 20 attempts');
}

// ── Validation ────────────────────────────────────────────────────────────────

// Slug: lowercase alphanumeric + hyphens, 2–50 chars, no leading/trailing hyphens.
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;

/** @param {string} slug */
function isValidSlug(slug) {
  return (
    typeof slug === 'string' &&
    slug.length >= 2         &&
    slug.length <= 50        &&
    SLUG_RE.test(slug)
  );
}

/** Accept only http:// and https:// URLs. */
function isValidUrl(u) {
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Body Parser ───────────────────────────────────────────────────────────────

/**
 * Consume the request body and parse it as JSON.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data',  chunk => chunks.push(chunk));
    req.on('end',   ()    => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ── Response Helpers ──────────────────────────────────────────────────────────

/** Set CORS headers to allow all origins. */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/** Send a JSON success response. */
function jsonOk(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** Send a JSON error response. */
function jsonErr(res, message, status = 400) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

/** Convert the DB object to the array format used by the API. */
function dbToLinkArray(db) {
  return Object.entries(db).map(([shortId, originalUrl]) => ({ shortId, originalUrl }));
}

// ── Cross-Platform Browser Opener ─────────────────────────────────────────────

/** Open a URL in the system's default browser. Fails silently. */
function openBrowser(url) {
  try {
    const platform = os.platform();
    if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    // Silently ignore — browser opening is best-effort.
  }
}

// ── Request Handler ───────────────────────────────────────────────────────────

/**
 * Main HTTP request handler.  All routing lives here.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
async function handleRequest(req, res) {
  setCors(res);

  // ── CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, 'http://localhost');
  const method = req.method.toUpperCase();

  // ── GET /health ────────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/health') {
    const db = dbRead();
    return jsonOk(res, {
      ok      : true,
      version : VERSION,
      uptime  : Math.floor((Date.now() - SERVER_START_MS) / 1000),
      links   : Object.keys(db).length,
      port    : PORT,
      os      : os.platform(),
    });
  }

  // ── GET / — Embedded dashboard ─────────────────────────────────────────────
  if (method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDashboard());
    return;
  }

  // ── GET /api/links ─────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/links') {
    const db    = dbRead();
    const links = dbToLinkArray(db);
    return jsonOk(res, { count: links.length, links });
  }

  // ── GET /api/links/:id ─────────────────────────────────────────────────────
  const singleMatch = pathname.match(/^\/api\/links\/([^/]+)$/);
  if (singleMatch) {
    const id = singleMatch[1];
    const db = dbRead();

    if (method === 'GET') {
      if (!db[id]) return jsonErr(res, 'Link not found', 404);
      return jsonOk(res, { shortId: id, originalUrl: db[id] });
    }

    // ── DELETE /api/links/:id ────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!db[id]) return jsonErr(res, 'Link not found', 404);
      delete db[id];
      dbWrite(db);
      return jsonOk(res, { ok: true });
    }
  }

  // ── POST /api/links ────────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/links') {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return jsonErr(res, 'Invalid JSON body', 400);
    }

    const { url, slug } = body;

    if (!url || typeof url !== 'string') {
      return jsonErr(res, 'Missing required field: url', 400);
    }
    if (!isValidUrl(url)) {
      return jsonErr(res, 'Invalid URL — must start with http:// or https://', 422);
    }

    const db = dbRead();

    // Custom slug path
    if (slug !== undefined && slug !== '') {
      if (!isValidSlug(slug)) {
        return jsonErr(
          res,
          'Invalid slug — use 2–50 lowercase alphanumeric chars and hyphens; no leading/trailing hyphens',
          422
        );
      }
      // 409 if the slug already maps to a *different* URL
      if (db[slug] && db[slug] !== url) {
        return jsonErr(res, 'Slug already taken by a different URL', 409);
      }
      db[slug] = url;
      dbWrite(db);
      return jsonOk(res, { shortId: slug, originalUrl: url }, 201);
    }

    // Deduplication — return existing ID if URL is already stored
    const existing = Object.entries(db).find(([, v]) => v === url);
    if (existing) {
      return jsonOk(res, { shortId: existing[0], originalUrl: url });
    }

    // Generate a fresh random ID
    let id;
    try {
      id = uniqueId(db);
    } catch (e) {
      return jsonErr(res, e.message, 500);
    }

    db[id] = url;
    dbWrite(db);
    return jsonOk(res, { shortId: id, originalUrl: url }, 201);
  }

  // ── GET /api/db/export ─────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/db/export') {
    const db      = dbRead();
    const content = JSON.stringify(db, null, 2);
    res.writeHead(200, {
      'Content-Type'       : 'application/json',
      'Content-Disposition': 'attachment; filename="links.json"',
    });
    res.end(content);
    return;
  }

  // ── POST /api/db/import ────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/db/import') {
    let incoming;
    try {
      incoming = await parseBody(req);
    } catch {
      return jsonErr(res, 'Invalid JSON body', 400);
    }

    if (
      incoming === null        ||
      Array.isArray(incoming)  ||
      typeof incoming !== 'object'
    ) {
      return jsonErr(res, 'Body must be a plain object mapping shortId → url', 400);
    }

    const db = dbRead();
    Object.assign(db, incoming);
    dbWrite(db);
    return jsonOk(res, { ok: true, count: Object.keys(db).length });
  }

  // ── Short-link redirect (GET /:id) ─────────────────────────────────────────
  const redirectMatch = pathname.match(/^\/([^/]+)$/);
  if (method === 'GET' && redirectMatch) {
    const db = dbRead();
    const id = redirectMatch[1];
    if (db[id]) {
      res.writeHead(302, { Location: db[id] });
      res.end();
      return;
    }
  }

  // ── 404 fallback ───────────────────────────────────────────────────────────
  jsonErr(res, 'Not found', 404);
}

// ── Embedded Web Dashboard ────────────────────────────────────────────────────

/**
 * Returns the full HTML string for the dashboard.
 * PORT, DB_FILE, and SERVER_START_MS are injected via template literals.
 */
function getDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shor · Dashboard</title>
<style>
/* ── Reset ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Design tokens ── */
:root{
  --bg:#0f0f0e;--surface:#1a1a18;--surface2:#242420;
  --border:#2c2c28;--text:#e2e2dc;--muted:#666;--faint:#2e2e2b;
  --accent:#7c75ff;--accent-h:#6c63ff;--glow:rgba(124,117,255,0.18);
  --green:#4ade80;--red:#f87171;--r:10px;
}
@media(prefers-color-scheme:light){
  :root{
    --bg:#f9f9f7;--surface:#fff;--surface2:#f4f4f1;
    --border:#e4e4de;--text:#1a1a1a;--muted:#999;--faint:#d0d0ca;
    --accent:#6c63ff;--accent-h:#5a52e0;--glow:rgba(108,99,255,0.15);
    --green:#16a34a;--red:#dc2626;
  }
}

/* ── Base ── */
html{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
body{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:0 16px 56px}

/* ── Header ── */
.header{
  width:100%;max-width:700px;
  display:flex;align-items:center;justify-content:space-between;
  padding:24px 0 20px;
  border-bottom:1px solid var(--border);
  margin-bottom:28px;
}
.logo{font-size:1.2rem;font-weight:700;letter-spacing:-0.02em;color:var(--text)}
.logo em{font-style:normal;color:var(--accent)}
.status{display:flex;align-items:center;gap:7px;font-size:0.78rem;color:var(--muted)}
.dot{
  width:7px;height:7px;border-radius:50%;background:var(--green);
  box-shadow:0 0 6px var(--green);flex-shrink:0;
  animation:pulse 2.5s ease-in-out infinite;
}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}

/* ── Cards ── */
.card{
  width:100%;max-width:700px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--r);padding:22px 24px;margin-bottom:16px;
}
.card-label{
  font-size:0.72rem;font-weight:600;letter-spacing:0.08em;
  text-transform:uppercase;color:var(--muted);margin-bottom:18px;
}

/* ── Form ── */
.form-row{display:flex;gap:8px}
.url-input{
  flex:1;background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:9px 14px;color:var(--text);
  font-size:0.9rem;outline:none;
  transition:border-color .18s,box-shadow .18s;
}
.url-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.url-input::placeholder{color:var(--muted)}

/* ── Buttons ── */
.btn{
  display:inline-flex;align-items:center;gap:5px;
  padding:9px 18px;border-radius:8px;border:none;
  cursor:pointer;font-size:0.875rem;font-weight:500;
  transition:background .15s,transform .1s,opacity .15s;
  white-space:nowrap;
}
.btn:active{transform:scale(0.97)}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-h)}
.btn-ghost{
  background:transparent;color:var(--muted);
  border:1px solid var(--border);
  font-size:0.78rem;padding:6px 11px;border-radius:7px;
  cursor:pointer;
  display:inline-flex;align-items:center;gap:4px;
  transition:color .15s,border-color .15s,background .15s;
  white-space:nowrap;
}
.btn-ghost:hover{color:var(--text);border-color:var(--muted)}
.btn-icon{
  background:transparent;color:var(--muted);border:none;
  padding:5px 7px;border-radius:6px;cursor:pointer;
  font-size:0.82rem;
  transition:color .15s,background .15s;
  line-height:1;
}
.btn-icon:hover{color:var(--text);background:var(--faint)}
.btn-icon.copied{color:var(--green)!important}
.btn-icon.delete-btn:hover{color:var(--red);opacity:1}

/* ── Custom slug row ── */
.toggle-slug-wrap{margin-top:10px}
.slug-row{
  display:flex;align-items:center;gap:8px;
  overflow:hidden;max-height:0;opacity:0;margin-top:0;
  transition:max-height .25s ease,opacity .22s ease,margin-top .22s ease;
}
.slug-row.open{max-height:52px;opacity:1;margin-top:10px}
.slug-prefix{color:var(--muted);font-size:0.82rem;white-space:nowrap;user-select:none;flex-shrink:0}
.slug-input{
  flex:1;background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:7px 12px;color:var(--text);
  font-size:0.84rem;font-family:ui-monospace,'SF Mono','Fira Code',monospace;
  outline:none;transition:border-color .18s,box-shadow .18s;
}
.slug-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.slug-input::placeholder{color:var(--muted)}

/* ── Feedback ── */
.feedback{
  font-size:0.81rem;overflow:hidden;
  max-height:0;opacity:0;margin-top:0;
  transition:max-height .2s ease,opacity .15s ease,margin-top .15s ease;
}
.feedback.show{max-height:44px;opacity:1;margin-top:10px}
.feedback.ok{color:var(--green)}
.feedback.err{color:var(--red)}

/* ── Links section header ── */
.links-header{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:14px;
}
.links-title{display:flex;align-items:center;gap:8px;font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}
.badge{
  background:var(--faint);border:1px solid var(--border);
  color:var(--muted);border-radius:999px;
  font-size:0.7rem;font-weight:600;padding:1px 9px;
  letter-spacing:.03em;
}
.links-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}

/* ── Link rows ── */
.link-list{display:flex;flex-direction:column;gap:3px}
.link-row{
  display:flex;align-items:center;gap:10px;
  padding:9px 12px;border-radius:8px;
  border:1px solid transparent;
  transition:background .14s,border-color .14s;
}
.link-row:hover{background:var(--surface2);border-color:var(--border)}
.link-id{
  font-family:ui-monospace,'SF Mono','Fira Code',monospace;
  font-size:0.8rem;color:var(--accent);flex-shrink:0;
  width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.link-url{
  flex:1;font-size:0.83rem;color:var(--muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;
}
.link-row-actions{display:flex;gap:1px;flex-shrink:0}

/* ── Empty state ── */
.empty{
  text-align:center;padding:44px 0;color:var(--muted);font-size:0.88rem;
}
.empty-icon{font-size:2.2rem;margin-bottom:10px;opacity:.35;display:block}

/* ── Footer ── */
.footer{
  width:100%;max-width:700px;
  margin-top:4px;padding-top:14px;
  border-top:1px solid var(--border);
  font-size:0.74rem;color:var(--muted);
  display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;
}
.footer-path{
  font-family:ui-monospace,'SF Mono',monospace;
  word-break:break-all;opacity:.7;
}

/* ── Hidden file input ── */
#import-input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
</style>
</head>
<body>

<!-- ── Header ─────────────────────────────────── -->
<header class="header">
  <div class="logo">shor<em>.</em> server</div>
  <div class="status">
    <span class="dot"></span>
    <span id="status-text">Running · Port ${PORT} · up 0s</span>
  </div>
</header>

<!-- ── New Link Card ──────────────────────────── -->
<div class="card">
  <div class="card-label">New Link</div>

  <div class="form-row">
    <input
      id="url-input"
      class="url-input"
      type="url"
      placeholder="https://example.com/your-long-url"
      autocomplete="off"
      spellcheck="false"
    >
    <button class="btn btn-primary" onclick="addLink()">Shorten →</button>
  </div>

  <div class="toggle-slug-wrap">
    <button class="btn-ghost" id="slug-toggle-btn" onclick="toggleSlug()">+ custom slug</button>
  </div>

  <div class="slug-row" id="slug-row">
    <span class="slug-prefix">localhost:${PORT}/</span>
    <input
      id="slug-input"
      class="slug-input"
      type="text"
      placeholder="my-custom-slug"
      autocomplete="off"
      spellcheck="false"
      maxlength="50"
    >
  </div>

  <div class="feedback" id="feedback"></div>
</div>

<!-- ── Links Card ────────────────────────────── -->
<div class="card">
  <div class="links-header">
    <div class="links-title">
      Links
      <span class="badge" id="count-badge">0</span>
    </div>
    <div class="links-actions">
      <button class="btn-ghost" onclick="exportDB()" title="Download links.json">↓ Export</button>
      <!-- The label IS the clickable Import button; the real input is hidden -->
      <label class="btn-ghost" for="import-input" style="cursor:pointer" title="Upload links.json to merge">↑ Import</label>
      <input type="file" id="import-input" accept=".json,application/json" onchange="importDB(event)">
      <button class="btn-ghost" onclick="loadLinks()" title="Refresh list">↻</button>
    </div>
  </div>

  <div class="link-list" id="link-list">
    <div class="empty"><span class="empty-icon">🔗</span>No links yet</div>
  </div>
</div>

<!-- ── Footer ────────────────────────────────── -->
<footer class="footer">
  <span>DB →</span>
  <span class="footer-path">${DB_FILE}</span>
</footer>

<script>
// ── Server-injected constants ──────────────────────────────────────────────
const SERVER_START_MS = ${SERVER_START_MS};
const SERVER_PORT     = ${PORT};

// ── Uptime ticker (updates header every second) ───────────────────────────
function fmtUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return totalSec + 's';
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60), rm = m % 60;
  return h + 'h ' + rm + 'm';
}

setInterval(() => {
  const el = document.getElementById('status-text');
  if (el) {
    el.textContent =
      'Running \u00b7 Port ' + SERVER_PORT +
      ' \u00b7 up ' + fmtUptime(Date.now() - SERVER_START_MS);
  }
}, 1000);

// ── Custom slug toggle ────────────────────────────────────────────────────
let slugOpen = false;

function toggleSlug() {
  slugOpen = !slugOpen;
  document.getElementById('slug-row').classList.toggle('open', slugOpen);
  document.getElementById('slug-toggle-btn').textContent =
    slugOpen ? '\u2212 custom slug' : '+ custom slug';
  if (slugOpen) {
    document.getElementById('slug-input').focus();
  } else {
    document.getElementById('slug-input').value = '';
  }
}

// ── Inline feedback ───────────────────────────────────────────────────────
function showFeedback(msg, isError) {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.className   = 'feedback show ' + (isError ? 'err' : 'ok');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'feedback'; }, isError ? 6000 : 4000);
}

// ── Add link ──────────────────────────────────────────────────────────────
async function addLink() {
  const urlEl  = document.getElementById('url-input');
  const slugEl = document.getElementById('slug-input');
  const url    = urlEl.value.trim();
  const slug   = slugOpen ? slugEl.value.trim() : '';

  if (!url) {
    showFeedback('Please enter a URL.', true);
    urlEl.focus();
    return;
  }

  const body = { url };
  if (slug) body.slug = slug;

  try {
    const res  = await fetch('/api/links', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || ('Error ' + res.status), true);
      return;
    }
    showFeedback(
      '\u2713 Shortened \u2192 ' + location.origin + '/' + data.shortId,
      false
    );
    urlEl.value = '';
    if (slugOpen) { slugEl.value = ''; toggleSlug(); }
    loadLinks();
  } catch (e) {
    showFeedback('Network error: ' + e.message, true);
  }
}

// ── Render links list ─────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLinks(links) {
  const list  = document.getElementById('link-list');
  const badge = document.getElementById('count-badge');
  badge.textContent = links.length;

  if (!links.length) {
    list.innerHTML = '<div class="empty"><span class="empty-icon">\\u{1F517}</span>No links yet</div>';
    return;
  }

  list.innerHTML = links.map(function(item) {
    var id  = escHtml(item.shortId);
    var url = escHtml(item.originalUrl);
    return (
      '<div class="link-row" id="row-' + id + '">' +
        '<span class="link-id" title="' + id + '">' + id + '</span>' +
        '<span class="link-url" title="' + url + '">' + url + '</span>' +
        '<div class="link-row-actions">' +
          '<button class="btn-icon" id="copy-' + id + '" ' +
            'onclick="copyLink(\'' + id + '\',this)" title="Copy short link">&#x2398;</button>' +
          '<a class="btn-icon" href="' + url + '" target="_blank" ' +
            'rel="noopener noreferrer" title="Open original URL" ' +
            'style="text-decoration:none;display:inline-flex;align-items:center">&#x2197;</a>' +
          '<button class="btn-icon delete-btn" ' +
            'onclick="deleteLink(\'' + id + '\')" ' +
            'title="Delete" style="color:var(--red);opacity:.65">&#x2715;</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ── Load links from API ───────────────────────────────────────────────────
async function loadLinks() {
  try {
    const res  = await fetch('/api/links');
    const data = await res.json();
    renderLinks(data.links || []);
  } catch {
    document.getElementById('link-list').innerHTML =
      '<div class="empty" style="color:var(--red)">Could not reach server</div>';
  }
}

// ── Delete a link ─────────────────────────────────────────────────────────
async function deleteLink(id) {
  if (!confirm('Delete /' + id + '?')) return;
  try {
    const res = await fetch('/api/links/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) {
      // Optimistic UI: remove the row immediately.
      var row = document.getElementById('row-' + id);
      if (row) row.remove();
      var badge = document.getElementById('count-badge');
      badge.textContent = Math.max(0, parseInt(badge.textContent, 10) - 1);
      // Show empty state if nothing left.
      var list = document.getElementById('link-list');
      if (!list.querySelector('.link-row')) {
        list.innerHTML = '<div class="empty"><span class="empty-icon">\\u{1F517}</span>No links yet</div>';
      }
    } else {
      var d = await res.json();
      alert('Delete failed: ' + (d.error || res.status));
    }
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

// ── Copy short link to clipboard ──────────────────────────────────────────
function copyLink(id, btn) {
  var url = location.origin + '/' + id;
  function onCopied() {
    btn.innerHTML = '&#x2713;';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.innerHTML = '&#x2398;';
      btn.classList.remove('copied');
    }, 1500);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(onCopied).catch(function() {
      fallbackCopy(url, onCopied);
    });
  } else {
    fallbackCopy(url, onCopied);
  }
}

function fallbackCopy(text, cb) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  cb();
}

// ── Export DB ─────────────────────────────────────────────────────────────
function exportDB() {
  location.href = '/api/db/export';
}

// ── Import DB (merge) ─────────────────────────────────────────────────────
async function importDB(event) {
  var file = event.target.files[0];
  if (!file) return;
  try {
    var text = await file.text();
    var data = JSON.parse(text);
    var res  = await fetch('/api/db/import', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(data),
    });
    var result = await res.json();
    if (res.ok) {
      showFeedback('\u2713 Imported \u2014 DB now has ' + result.count + ' links', false);
      loadLinks();
    } else {
      showFeedback(result.error || 'Import failed', true);
    }
  } catch (e) {
    showFeedback('Import error: ' + e.message, true);
  }
  event.target.value = '';
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('url-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addLink();
  });
  document.getElementById('slug-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addLink();
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
loadLinks();
setInterval(loadLinks, 5000);
</script>
</body>
</html>`;
}

// ── Startup Banner ────────────────────────────────────────────────────────────

function printBanner() {
  const base = `http://localhost:${PORT}`;
  const pad  = '  ';
  const line = (label, value) =>
    `${pad}${C.dim}${label.padEnd(10)}${C.reset}  →  ${value}`;

  console.log('');
  console.log(`${pad}${C.dim}╭─────────────────────────────────╮${C.reset}`);
  console.log(`${pad}${C.dim}│${C.reset}  ${C.bold}${C.magenta}🔗  Shor Server  v${VERSION}${C.reset}           ${C.dim}│${C.reset}`);
  console.log(`${pad}${C.dim}╰─────────────────────────────────╯${C.reset}`);
  console.log('');
  console.log(line('Dashboard', `${C.cyan}${base}${C.reset}`));
  console.log(line('API',       `${C.cyan}${base}/api/links${C.reset}`));
  console.log(line('DB file',   `${C.green}${DB_FILE}${C.reset}`));
  console.log(line('OS',        `${C.dim}${os.platform()}  (Node ${process.version})${C.reset}`));
  console.log('');
  console.log(`${pad}${C.dim}Press Ctrl+C to stop${C.reset}`);
  console.log('');
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error(`${C.red}[error]${C.reset}`, err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n${C.red}Error:${C.reset} Port ${PORT} is already in use.\n` +
      `       Try: ${C.cyan}node server.js --port ${PORT + 1}${C.reset}\n`
    );
  } else {
    console.error(`${C.red}Server error:${C.reset}`, err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  printBanner();
  if (!NO_BROWSER) {
    openBrowser(`http://localhost:${PORT}`);
  }
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log(`\n  ${C.dim}Shutting down gracefully…${C.reset}`);
  server.close(() => {
    console.log(`  ${C.green}✓ Goodbye!${C.reset}\n`);
    process.exit(0);
  });
});
