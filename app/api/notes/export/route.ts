import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import { applySessionRefresh } from "@/lib/auth";
import { listPrivateNotes } from "@/lib/account-data";
import { stripNoteHtml } from "@/lib/note-html";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const notes = await listPrivateNotes(auth.session.userId);

  if (format === "md") {
    const stamp = new Date().toLocaleDateString("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const header = `# Notes\n\n*Exported ${stamp} - ${notes.length} ${notes.length === 1 ? "note" : "notes"}*\n\n---\n\n`;
    const body = notes
      .map((note) =>
        [
          `## ${note.title || "Untitled"}`,
          `*Updated ${new Date(note.updatedAt).toLocaleDateString("en", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}*`,
          "",
          stripNoteHtml(note.content) || "_(empty note)_",
        ].join("\n"),
      )
      .join("\n\n---\n\n");

    const response = new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="notes.md"',
      },
    });
    applySessionRefresh(response, auth.refreshedToken);
    return response;
  }

  const response = new NextResponse(JSON.stringify(notes, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="notes.json"',
    },
  });
  applySessionRefresh(response, auth.refreshedToken);
  return response;
}
