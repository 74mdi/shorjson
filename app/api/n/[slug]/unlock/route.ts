import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";
import { getPrivateNoteBySlug } from "@/lib/account-data";
import {
  createUnlockCookieValue,
  getOptionalPassword,
  getUnlockCookieName,
  verifyLinkPassword,
} from "@/lib/link-protection";
import { getClientIp, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 12;

const unlockRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 15,
});

function isSecureRequest(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  const { slug } = await params;

  // Rate limit by IP + slug to prevent brute-force
  const rateLimitKey = `${getClientIp(req)}:note:${slug}`;
  try {
    await unlockRateLimiter.consume(rateLimitKey);
  } catch {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const body = await req.json().catch(() => null);
  const password = getOptionalPassword(body?.password);

  if (!password) {
    return NextResponse.json(
      { error: "Enter the password to continue." },
      { status: 400 },
    );
  }

  const note = await getPrivateNoteBySlug(slug);

  if (!note || !note.isPublic) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (!note.passwordHash) {
    return NextResponse.json(
      { error: "This note does not require a password." },
      { status: 400 },
    );
  }

  const isValidPassword = await verifyLinkPassword(password, note);
  if (!isValidPassword) {
    return NextResponse.json(
      { error: "Wrong password. Try again." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, redirectTo: `/n/${slug}` });
  response.cookies.set({
    name: getUnlockCookieName(`n/${slug}`),
    value: createUnlockCookieValue(`n/${slug}`, note),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: `/n/${slug}`,
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  });

  return response;
}
