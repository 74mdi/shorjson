// POST /api/notes/import
// Imports a notes JSON array into the active storage (DB adapter or local JSON).
// Body: Note[]  (array as produced by GET /api/notes/export?format=json)
// Returns: { ok: true, imported: number }

import { NextRequest, NextResponse } from "next/server";
import { setNote } from "@/lib/adapter-utils";
import type { Note } from "@/lib/notes-storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid body. Expected a Note array." },
      { status: 400 },
    );
  }

  let imported = 0;
  const now = new Date().toISOString();

  for (const item of body as Partial<Note>[]) {
    if (!item.id || (!item.title && !item.content)) continue;
    await setNote(item.id, {
      id:        String(item.id),
      title:     String(item.title     ?? ""),
      content:   String(item.content   ?? ""),
      createdAt: String(item.createdAt ?? now),
      updatedAt: String(item.updatedAt ?? now),
    });
    imported++;
  }

  return NextResponse.json({ ok: true, imported });
}
