// app/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLinks, clickLink } from "@/lib/adapter-utils";
import { getRemoteServerUrl } from "@/lib/config";

// Social-media scrapers and link-preview bots
const BOT_RE =
  /bot|crawler|spider|scraper|facebookexternalhit|facebot|twitterbot|slackbot|whatsapp|discord|telegram|linkedinbot|pinterest|google|bing|yahoo|duckduck|applebot|semrush|ahrefsbot|msnbot|rogerbot|embedly|quora|outbrain|buffer|vkshare|xing|stumbleupon|bitlybot|preview/i;

function buildOgHtml(opts: {
  slug: string;
  originalUrl: string;
  clicks: number;
  origin: string;
}) {
  const { slug, originalUrl, clicks, origin } = opts;
  const ogImage = `${origin}/api/og?slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(originalUrl)}&clicks=${clicks}`;
  const title   = `/${slug} — Shor`;
  const desc    = originalUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>

  <!-- Standard OG -->
  <meta property="og:type"        content="website"/>
  <meta property="og:title"       content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image"       content="${ogImage}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url"         content="${origin}/${slug}"/>

  <!-- Twitter / X card -->
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image"       content="${ogImage}"/>

  <!-- Instant redirect for any non-bot that ends up here -->
  <meta http-equiv="refresh" content="0; url=${originalUrl}"/>
  <link rel="canonical" href="${originalUrl}"/>
</head>
<body>
  <p>Redirecting to <a href="${originalUrl}">${originalUrl}</a>…</p>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const remoteUrl = getRemoteServerUrl();
  let originalUrl: string | null = null;
  let clicks = 0;

  if (remoteUrl) {
    try {
      const res = await fetch(
        `${remoteUrl}/api/links/${encodeURIComponent(slug)}`,
        { signal: AbortSignal.timeout(3000), cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as { originalUrl?: string; clicks?: number };
        originalUrl = data.originalUrl ?? null;
        clicks = data.clicks ?? 0;
      }
    } catch {
      /* fall through */
    }
  }

  if (!originalUrl) {
    const links = await getLinks();
    const entry = links[slug];
    if (entry) {
      originalUrl =
        typeof entry === "object" ? entry.originalUrl : (entry as unknown as string);
      clicks = typeof entry === "object" ? (entry.clicks ?? 0) : 0;
    }
  }

  if (!originalUrl) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Link not found</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#0a0a0a}.card{text-align:center;padding:2.5rem 2rem;background:#fff;border:1px solid #e5e5e5;border-radius:1rem;max-width:380px;width:90%}h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}p{color:#737373;font-size:.875rem;line-height:1.5;margin-bottom:1.5rem}a{display:inline-block;color:#fff;background:#0a0a0a;text-decoration:none;font-weight:600;font-size:.875rem;padding:.6rem 1.4rem;border-radius:.5rem}a:hover{background:#262626}</style></head><body><div class="card"><h1>Link not found</h1><p>This short link does not exist or may have been removed.</p><a href="/">← Back home</a></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  const ua = req.headers.get("user-agent") ?? "";

  // Serve OG-enriched HTML to social bots so they render a preview card.
  // Track the click only for real user visits.
  if (BOT_RE.test(ua)) {
    const origin =
      req.headers.get("x-forwarded-proto")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`
        : new URL(req.url).origin;

    return new NextResponse(buildOgHtml({ slug, originalUrl, clicks, origin }), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // Real user → track click + instant redirect
  const links = await getLinks();
  await clickLink(slug, links);
  return NextResponse.redirect(originalUrl, { status: 308 });
}
