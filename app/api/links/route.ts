// GET /api/links — returns all links with full metadata.

import { NextResponse } from "next/server";
import { getLinks } from "@/lib/adapter-utils";
import { isPasswordProtected } from "@/lib/link-protection";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = await getLinks();
  const entries = Object.entries(links)
    .map(([shortId, entry]) => ({
      shortId,
      originalUrl: entry.originalUrl,
      createdAt: entry.createdAt,
      clicks: entry.clicks,
      hasPassword: isPasswordProtected(entry),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return NextResponse.json({ count: entries.length, links: entries });
}
