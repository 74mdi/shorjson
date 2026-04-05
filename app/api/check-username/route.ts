import { NextRequest, NextResponse } from "next/server";
import { isBioUsernameAvailable } from "@/lib/account-data";
import { getRequestSession } from "@/lib/auth";
import { USERNAME_PATTERN } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const candidate = new URL(request.url).searchParams.get("u")?.trim().toLowerCase() ?? "";

  if (!candidate || !USERNAME_PATTERN.test(candidate)) {
    return NextResponse.json({ available: false });
  }

  const { session } = await getRequestSession(request);
  const available = await isBioUsernameAvailable(candidate, session?.userId);

  return NextResponse.json({ available });
}
