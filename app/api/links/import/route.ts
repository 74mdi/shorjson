// POST /api/links/import
// Imports a links JSON object into the active storage (DB adapter or local JSON).
// Body: Record<shortId, { originalUrl, createdAt, clicks }>
// Returns: { ok: true, imported: number }

import { NextRequest, NextResponse } from "next/server";
import { setLink } from "@/lib/adapter-utils";
import type { LinkEntry } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid body. Expected an object mapping shortId → LinkEntry." },
      { status: 400 },
    );
  }

  const links = body as Record<string, Partial<LinkEntry>>;
  let imported = 0;

  for (const [id, entry] of Object.entries(links)) {
    if (!id || !entry?.originalUrl) continue;
    await setLink(id, {
      originalUrl: String(entry.originalUrl),
      createdAt:   String(entry.createdAt ?? new Date().toISOString()),
      clicks:      Number(entry.clicks    ?? 0),
    });
    imported++;
  }

  return NextResponse.json({ ok: true, imported });
}
