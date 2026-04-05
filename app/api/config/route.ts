// app/api/config/route.ts
// GET  /api/config          → { remoteServerUrl: string | null }
// POST /api/config          → body { serverUrl: string | null } → saves, returns { ok: true }
// DELETE /api/config        → clears remote URL, returns { ok: true }

import { NextRequest, NextResponse } from "next/server";
import { getRemoteServerUrl, setRemoteServerUrl } from "@/lib/config";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ remoteServerUrl: getRemoteServerUrl() });
}

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const url = body.serverUrl ?? null;
  setRemoteServerUrl(typeof url === "string" ? url.trim() || null : null);
  return NextResponse.json({ ok: true, remoteServerUrl: getRemoteServerUrl() });
}

export async function DELETE(req: NextRequest) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  setRemoteServerUrl(null);
  return NextResponse.json({ ok: true });
}
