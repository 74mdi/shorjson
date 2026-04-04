// GET /api/notes/export?format=json|md
// Downloads all notes as a file in the requested format.

import { NextRequest, NextResponse } from "next/server";
import { readNotes } from "@/lib/notes-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const format = new URL(req.url).searchParams.get("format") ?? "json";
  const notes  = Object.values(readNotes()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (format === "md") {
    const stamp  = new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
    const header = `# Notes\n\n*Exported ${stamp} — ${notes.length} ${notes.length === 1 ? "note" : "notes"}*\n\n---\n\n`;
    const body   = notes.map(n => {
      const heading = `## ${n.title || "Untitled"}`;
      const date    = `*${new Date(n.updatedAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}*`;
      return [heading, date, "", n.content || "_(no content)_"].join("\n").trimEnd();
    }).join("\n\n---\n\n");

    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="notes.md"',
      },
    });
  }

  // JSON (default)
  return new NextResponse(JSON.stringify(notes, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="notes.json"',
    },
  });
}
