import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getNotes, setNote } from "@/lib/adapter-utils";
import type { Note } from "@/lib/notes-storage";
import { getRemoteServerUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const remote = getRemoteServerUrl();
  if (remote) {
    try {
      const res = await fetch(`${remote}/api/notes`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      return NextResponse.json(await res.json(), { status: res.status });
    } catch {
      return NextResponse.json(
        { error: "Remote server unreachable." },
        { status: 503 },
      );
    }
  }
  const list = await getNotes();
  return NextResponse.json({ count: list.length, notes: list });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title && !content)
    return NextResponse.json(
      { error: "Title or content is required." },
      { status: 400 },
    );

  const remote = getRemoteServerUrl();
  if (remote) {
    try {
      const res = await fetch(`${remote}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json(await res.json(), { status: res.status });
    } catch {
      return NextResponse.json(
        { error: "Remote server unreachable." },
        { status: 503 },
      );
    }
  }

  const now: string = new Date().toISOString();
  const note: Note = {
    id: nanoid(7),
    title,
    content,
    createdAt: now,
    updatedAt: now,
  };
  await setNote(note.id, note);
  return NextResponse.json(note, { status: 201 });
}
