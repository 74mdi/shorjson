// app/api/db/route.ts
// GET /api/db → download only the authenticated user's short links as JSON

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/api-auth";
import { applySessionRefresh } from "@/lib/auth";
import { getLinks } from "@/lib/adapter-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const links = await getLinks();
  const scopedLinks = Object.fromEntries(
    Object.entries(links).filter(([, entry]) => entry.userId === auth.session.userId),
  );
  const json = JSON.stringify(scopedLinks, null, 2);
  const response = new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="links.json"',
    },
  });
  applySessionRefresh(response, auth.refreshedToken);
  return response;
}
