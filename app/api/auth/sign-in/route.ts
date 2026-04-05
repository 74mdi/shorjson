import { NextRequest, NextResponse } from "next/server";
import {
  issueSession,
  setSessionCookie,
  verifyAccountPassword,
} from "@/lib/auth";
import { getUserByUsername } from "@/lib/account-data";
import { signInSchema } from "@/lib/schemas";
import { enforceSignInRateLimit, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const GENERIC_AUTH_ERROR = "Invalid username or password.";

export async function POST(request: NextRequest) {
  const rateLimitError = await enforceSignInRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  const user = await getUserByUsername(parsed.data.username);
  const isValidPassword = user
    ? await verifyAccountPassword(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !isValidPassword) {
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  const { token } = await issueSession({
    userId: user.id,
    username: user.username,
  });

  const response = NextResponse.json({
    user: { id: user.id, username: user.username },
  });
  setSessionCookie(response, token);
  return response;
}
