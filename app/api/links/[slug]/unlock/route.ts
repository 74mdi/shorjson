import { NextRequest, NextResponse } from "next/server";
import { getLinks } from "@/lib/adapter-utils";
import {
  createUnlockCookieValue,
  getOptionalPassword,
  getUnlockCookieName,
  isPasswordProtected,
  verifyLinkPassword,
} from "@/lib/link-protection";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 12;

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
  const body = await req.json().catch(() => null);
  const password = getOptionalPassword(body?.password);

  if (!password) {
    return NextResponse.json(
      { error: "Enter the password to continue." },
      { status: 400 },
    );
  }

  const links = await getLinks();
  const entry = links[slug];

  if (!entry) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (!isPasswordProtected(entry)) {
    return NextResponse.json(
      { error: "This link does not require a password." },
      { status: 400 },
    );
  }

  const isValidPassword = await verifyLinkPassword(password, entry);
  if (!isValidPassword) {
    return NextResponse.json(
      { error: "Wrong password. Try again." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, redirectTo: `/${slug}` });
  response.cookies.set({
    name: getUnlockCookieName(slug),
    value: createUnlockCookieValue(slug, entry),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: `/${slug}`,
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  });

  return response;
}
