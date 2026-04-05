// PATCH  /api/db-connections/:id  — set active or update name
// DELETE /api/db-connections/:id  — remove a saved connection

import { NextRequest, NextResponse } from "next/server";
import { readConnections, writeConnections } from "@/lib/db-connections";
import { clearAdapterCache } from "@/lib/db-adapter";
import { verifySameOrigin } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  const { id } = await params;
  const body   = await req.json().catch(() => ({})) as Record<string, unknown>;
  const conns  = readConnections();
  const idx    = conns.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (body.setActive === true) {
    conns.forEach((c) => { c.isActive = c.id === id; });
    await clearAdapterCache();
  }
  if (body.setActive === false) {
    conns[idx].isActive = false;
    await clearAdapterCache();
  }
  if (typeof body.name === "string") conns[idx].name = body.name.trim();

  writeConnections(conns);
  return NextResponse.json(conns[idx]);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  const { id } = await params;
  const conns  = readConnections();
  const conn   = conns.find((c) => c.id === id);
  if (!conn) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (conn.isActive) await clearAdapterCache();
  writeConnections(conns.filter((c) => c.id !== id));
  return NextResponse.json({ ok: true });
}
