import { NextResponse } from "next/server";
import { getLinks } from "@/lib/adapter-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = await getLinks();
  const recentLinks = Object.entries(links)
    .map(([shortId, entry]) => ({
      shortId,
      originalUrl: entry.originalUrl,
      createdAt: entry.createdAt,
      clicks: entry.clicks,
      hasPassword: Boolean(entry.passwordHash),
    }))
    .sort((left, right) => {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 12);

  return NextResponse.json({
    count: recentLinks.length,
    links: recentLinks,
  });
}
