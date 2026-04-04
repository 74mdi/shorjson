// app/api/shorten/route.ts
// POST /api/shorten
// If a remote server is configured (lib/config.ts), proxies the request there.
// Otherwise falls back to local JSON file storage.
// Each link is stored as a LinkEntry { originalUrl, createdAt, clicks }.

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getLinks, setLink } from "@/lib/adapter-utils";
import { getRemoteServerUrl } from "@/lib/config";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_URL = 2048;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const RESERVED = new Set([
  "api",
  "static",
  "_next",
  "favicon.ico",
  "icon",
  "apple-icon",
  "manifest",
  "sw",
  "sw.js",
  "robots.txt",
  "sitemap.xml",
]);
const PRIVATE_IP =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|::1|fc00:|fd)/i;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
]);

function isValidUrl(u: string) {
  try {
    const { protocol } = new URL(u);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeUrl(u: string): { safe: boolean; reason?: string } {
  try {
    const { hostname, port } = new URL(u);
    const h = hostname.toLowerCase().replace(/\.$/, "");
    if (BLOCKED_HOSTS.has(h))
      return { safe: false, reason: "Internal hostnames are not allowed." };
    if (PRIVATE_IP.test(h))
      return { safe: false, reason: "Private IP addresses are not allowed." };
    if (
      port &&
      ["22", "23", "25", "3306", "5432", "6379", "27017"].includes(port)
    )
      return { safe: false, reason: `Port ${port} is not allowed.` };
    return { safe: true };
  } catch {
    return { safe: false, reason: "Could not parse the URL." };
  }
}

function isValidSlug(s: string): { valid: boolean; reason?: string } {
  if (s.length < 2)
    return { valid: false, reason: "Slug must be at least 2 characters." };
  if (s.length > 50)
    return { valid: false, reason: "Slug must be at most 50 characters." };
  if (!SLUG_RE.test(s))
    return {
      valid: false,
      reason:
        "Slug may only contain lowercase letters, numbers, and hyphens (not at start/end).",
    };
  if (RESERVED.has(s))
    return { valid: false, reason: "That slug is reserved." };
  return { valid: true };
}

function getBaseUrl(req: NextRequest) {
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}`;
}

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Rate limiter (in-memory) ──────────────────────────────────────────────────

const RL = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 15,
  RL_WIN = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of RL) if (now > v.resetAt) RL.delete(k);
}, RL_WIN);

function rateLimit(ip: string): {
  ok: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const e = RL.get(ip);
  if (!e || now > e.resetAt) {
    RL.set(ip, { count: 1, resetAt: now + RL_WIN });
    return { ok: true, remaining: RL_MAX - 1, resetIn: 60 };
  }
  if (e.count >= RL_MAX)
    return {
      ok: false,
      remaining: 0,
      resetIn: Math.ceil((e.resetAt - now) / 1000),
    };
  e.count++;
  return {
    ok: true,
    remaining: RL_MAX - e.count,
    resetIn: Math.ceil((e.resetAt - now) / 1000),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Rate limit
  const rl = rateLimit(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.resetIn}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetIn) } },
    );
  }

  // 2. Parse body
  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json(
      { error: "A valid URL is required." },
      { status: 400 },
    );
  }

  const originalUrl = body.url.trim();
  const customSlug: string | undefined =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase()
      : undefined;

  // 3. Validations
  if (originalUrl.length > MAX_URL)
    return NextResponse.json(
      { error: `URL too long (max ${MAX_URL} chars).` },
      { status: 422 },
    );
  if (!isValidUrl(originalUrl))
    return NextResponse.json(
      { error: "Invalid URL. Must start with http:// or https://" },
      { status: 422 },
    );
  const safety = isSafeUrl(originalUrl);
  if (!safety.safe)
    return NextResponse.json({ error: safety.reason }, { status: 422 });
  if (customSlug) {
    const sc = isValidSlug(customSlug);
    if (!sc.valid)
      return NextResponse.json({ error: sc.reason }, { status: 422 });
  }

  // 4. If remote server configured, proxy there
  const remoteUrl = getRemoteServerUrl();
  if (remoteUrl) {
    try {
      const upstream = await fetch(`${remoteUrl}/api/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: originalUrl, slug: customSlug }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return NextResponse.json(
          {
            error: (data as { error?: string }).error ?? "Remote server error.",
          },
          { status: upstream.status },
        );
      }
      const { shortId } = data as { shortId: string };
      return NextResponse.json(
        { shortId, shortUrl: `${getBaseUrl(req)}/${shortId}` },
        { status: upstream.status === 201 ? 201 : 200 },
      );
    } catch {
      return NextResponse.json(
        { error: "Could not reach remote server. Is it running?" },
        { status: 503 },
      );
    }
  }

  // 5. Local storage path
  const links = await getLinks();
  const now = new Date().toISOString();

  if (customSlug !== undefined) {
    const existingEntry = links[customSlug];
    // Slug taken by a different URL → conflict
    if (
      existingEntry !== undefined &&
      existingEntry.originalUrl !== originalUrl
    ) {
      return NextResponse.json(
        { error: "That slug is already in use." },
        { status: 409 },
      );
    }
    // Slug already points to the same URL → return existing metadata
    if (existingEntry !== undefined) {
      return NextResponse.json({
        shortId: customSlug,
        shortUrl: `${getBaseUrl(req)}/${customSlug}`,
        createdAt: existingEntry.createdAt,
        clicks: existingEntry.clicks,
      });
    }
    await setLink(customSlug, { originalUrl, createdAt: now, clicks: 0 });
    return NextResponse.json(
      {
        shortId: customSlug,
        shortUrl: `${getBaseUrl(req)}/${customSlug}`,
        createdAt: now,
        clicks: 0,
      },
      { status: 201 },
    );
  }

  // Deduplication: same URL already shortened → return existing metadata
  const existing = Object.entries(links).find(
    ([, v]) => v.originalUrl === originalUrl,
  );
  if (existing) {
    const [existingId, existingMeta] = existing;
    return NextResponse.json({
      shortId: existingId,
      shortUrl: `${getBaseUrl(req)}/${existingId}`,
      createdAt: existingMeta.createdAt,
      clicks: existingMeta.clicks,
    });
  }

  let shortId = nanoid(7);
  let attempts = 0;
  while (links[shortId] && attempts++ < 5) shortId = nanoid(7);
  await setLink(shortId, { originalUrl, createdAt: now, clicks: 0 });
  return NextResponse.json(
    {
      shortId,
      shortUrl: `${getBaseUrl(req)}/${shortId}`,
      createdAt: now,
      clicks: 0,
    },
    { status: 201 },
  );
}
