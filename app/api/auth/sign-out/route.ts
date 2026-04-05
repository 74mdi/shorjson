import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { requireAuthenticatedRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
