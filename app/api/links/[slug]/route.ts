import { NextResponse } from "next/server";
import { getLinkBySlug } from "@/lib/links";
import { isPasswordProtected } from "@/lib/link-protection";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = await getLinkBySlug(slug);

  if (!entry) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  return NextResponse.json({
    shortId: entry.shortId,
    originalUrl: entry.originalUrl,
    createdAt: entry.createdAt,
    clicks: entry.clicks,
    hasPassword: isPasswordProtected(entry),
  });
}
