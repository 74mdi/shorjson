// app/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLinks, clickLink } from "@/lib/adapter-utils";
import { getRemoteServerUrl } from "@/lib/config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const remoteUrl = getRemoteServerUrl();
  let originalUrl: string | null = null;

  if (remoteUrl) {
    try {
      const res = await fetch(
        `${remoteUrl}/api/links/${encodeURIComponent(slug)}`,
        {
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        },
      );
      if (res.ok)
        originalUrl =
          ((await res.json()) as { originalUrl?: string }).originalUrl ?? null;
    } catch {
      /* fall through */
    }
  }

  if (!originalUrl) {
    const links = await getLinks();
    const entry = links[slug];
    if (entry) {
      originalUrl =
        typeof entry === "object"
          ? entry.originalUrl
          : (entry as unknown as string);
      await clickLink(slug, links);
    }
  }

  if (!originalUrl) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Link not found</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#0a0a0a}.card{text-align:center;padding:2.5rem 2rem;background:#fff;border:1px solid #e5e5e5;border-radius:1rem;max-width:380px;width:90%}h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}p{color:#737373;font-size:.875rem;line-height:1.5;margin-bottom:1.5rem}a{display:inline-block;color:#fff;background:#0a0a0a;text-decoration:none;font-weight:600;font-size:.875rem;padding:.6rem 1.4rem;border-radius:.5rem}a:hover{background:#262626}</style></head><body><div class="card"><h1>Link not found</h1><p>This short link does not exist or may have been removed.</p><a href="/">← Back home</a></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  return NextResponse.redirect(originalUrl, { status: 308 });
}
