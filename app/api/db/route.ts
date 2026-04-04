// app/api/db/route.ts
// GET /api/db → download the local links.json as a file attachment

import { NextResponse } from "next/server";
import { readLinks } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = readLinks();
  const json = JSON.stringify(links, null, 2);
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="links.json"',
    },
  });
}
