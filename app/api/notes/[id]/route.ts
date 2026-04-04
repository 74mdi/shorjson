import { NextRequest, NextResponse } from "next/server";
import { getNoteById, setNote, removeNote } from "@/lib/adapter-utils";
import { getRemoteServerUrl } from "@/lib/config";

type Ctx = { params: Promise<{ id: string }> };

async function proxyRemote(
  remote: string,
  path: string,
  method: string,
  body?: unknown,
) {
  const res = await fetch(`${remote}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const remote = getRemoteServerUrl();
  if (remote) {
    try {
      return await proxyRemote(remote, `/api/notes/${id}`, "GET");
    } catch {
      return NextResponse.json(
        { error: "Remote unreachable." },
        { status: 503 },
      );
    }
  }
  const note = await getNoteById(id);
  if (!note)
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const remote = getRemoteServerUrl();
  if (remote) {
    try {
      return await proxyRemote(remote, `/api/notes/${id}`, "PUT", body);
    } catch {
      return NextResponse.json(
        { error: "Remote unreachable." },
        { status: 503 },
      );
    }
  }
  const existing = await getNoteById(id);
  if (!existing)
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  const updated = {
    ...existing,
    title:
      body.title !== undefined ? String(body.title).trim() : existing.title,
    content:
      body.content !== undefined
        ? String(body.content).trim()
        : existing.content,
    updatedAt: new Date().toISOString(),
  };
  await setNote(id, updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const remote = getRemoteServerUrl();
  if (remote) {
    try {
      return await proxyRemote(remote, `/api/notes/${id}`, "DELETE");
    } catch {
      return NextResponse.json(
        { error: "Remote unreachable." },
        { status: 503 },
      );
    }
  }
  const existing = await getNoteById(id);
  if (!existing)
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  await removeNote(id);
  return NextResponse.json({ ok: true });
}
