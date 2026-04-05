import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import { applySessionRefresh } from "@/lib/auth";
import { getLinks } from "@/lib/adapter-utils";
import { listBioLinks, listPrivateNotes } from "@/lib/account-data";
import { signExportPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const [links, notes, shortLinks] = await Promise.all([
    listBioLinks(auth.session.userId),
    listPrivateNotes(auth.session.userId),
    getLinks(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: auth.session.userId,
      username: auth.session.username,
    },
    bioLinks: links,
    shortLinks: Object.entries(shortLinks)
      .filter(([, entry]) => entry.userId === auth.session.userId)
      .map(([shortId, entry]) => ({
        shortId,
        ...entry,
      })),
    notes,
  };

  const signedExport = {
    ...payload,
    signature: signExportPayload(payload),
  };

  const response = new NextResponse(JSON.stringify(signedExport, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-data.json"',
    },
  });
  applySessionRefresh(response, auth.refreshedToken);

  return response;
}
