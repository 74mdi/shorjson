import { NextRequest, NextResponse } from "next/server";
import { clickLink, getLinks } from "@/lib/adapter-utils";
import { getLinkBySlug } from "@/lib/links";
import {
  getUnlockCookieName,
  hasValidUnlockCookie,
  isPasswordProtected,
} from "@/lib/link-protection";

// Social-media scrapers and link-preview bots
const BOT_RE =
  /bot|crawler|spider|scraper|facebookexternalhit|facebot|twitterbot|slackbot|whatsapp|discord|telegram|linkedinbot|pinterest|google|bing|yahoo|duckduck|applebot|semrush|ahrefsbot|msnbot|rogerbot|embedly|quora|outbrain|buffer|vkshare|xing|stumbleupon|bitlybot|preview/i;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

function getOrigin(req: NextRequest) {
  return req.headers.get("x-forwarded-proto")
    ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`
    : new URL(req.url).origin;
}

function buildOgHtml(opts: {
  slug: string;
  originalUrl: string;
  clicks: number;
  origin: string;
}) {
  const { slug, originalUrl, clicks, origin } = opts;
  const ogImage = `${origin}/api/og?slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(originalUrl)}&clicks=${clicks}`;
  const title = `/${slug} — Shor`;
  const desc = originalUrl;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const safeUrl = escapeHtml(originalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${safeTitle}</title>

  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDesc}"/>
  <meta property="og:image" content="${ogImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${origin}/${encodeURIComponent(slug)}"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${safeTitle}"/>
  <meta name="twitter:description" content="${safeDesc}"/>
  <meta name="twitter:image" content="${ogImage}"/>

  <meta http-equiv="refresh" content="0; url=${safeUrl}"/>
  <link rel="canonical" href="${safeUrl}"/>
</head>
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>...</p>
</body>
</html>`;
}

function buildProtectedHtml(opts: { slug: string; origin: string }) {
  const { slug, origin } = opts;
  const title = `/${slug} — Protected link`;
  const safeTitle = escapeHtml(title);
  const unlockUrl = `${origin}/unlock/${encodeURIComponent(slug)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${safeTitle}</title>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="This short link is protected by a password."/>
  <meta property="og:url" content="${unlockUrl}"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${safeTitle}"/>
  <meta name="twitter:description" content="This short link is protected by a password."/>
</head>
<body>
  <p>This short link is protected. Open <a href="${unlockUrl}">${unlockUrl}</a> to continue.</p>
</body>
</html>`;
}

function buildMissingHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Link not found</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#0a0a0a}.card{text-align:center;padding:2.5rem 2rem;background:#fff;border:1px solid #e5e5e5;border-radius:1rem;max-width:380px;width:90%}h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}p{color:#737373;font-size:.875rem;line-height:1.5;margin-bottom:1.5rem}a{display:inline-block;color:#fff;background:#0a0a0a;text-decoration:none;font-weight:600;font-size:.875rem;padding:.6rem 1.4rem;border-radius:.5rem}a:hover{background:#262626}</style></head><body><div class="card"><h1>Link not found</h1><p>This short link does not exist or may have been removed.</p><a href="/">← Back home</a></div></body></html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = await getLinkBySlug(slug);

  if (!entry) {
    return new NextResponse(buildMissingHtml(), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const origin = getOrigin(req);
  const protectedLink = isPasswordProtected(entry);

  if (BOT_RE.test(ua)) {
    return new NextResponse(
      protectedLink
        ? buildProtectedHtml({ slug, origin })
        : buildOgHtml({
            slug,
            originalUrl: entry.originalUrl,
            clicks: entry.clicks,
            origin,
          }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (protectedLink) {
    const cookieName = getUnlockCookieName(slug);
    const unlockCookie = req.cookies.get(cookieName)?.value;

    if (!hasValidUnlockCookie(slug, entry, unlockCookie)) {
      const response = NextResponse.redirect(
        new URL(`/unlock/${encodeURIComponent(slug)}`, req.url),
        { status: 307 },
      );

      if (unlockCookie) {
        response.cookies.set({
          name: cookieName,
          value: "",
          httpOnly: true,
          sameSite: "lax",
          secure:
            req.nextUrl.protocol === "https:" ||
            req.headers.get("x-forwarded-proto") === "https",
          path: `/${slug}`,
          maxAge: 0,
        });
      }

      return response;
    }
  }

  const localLinks = await getLinks();
  if (localLinks[slug]) {
    await clickLink(slug, localLinks);
  }

  return NextResponse.redirect(entry.originalUrl, { status: 308 });
}
