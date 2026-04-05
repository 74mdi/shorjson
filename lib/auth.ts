import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "shor_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_REFRESH_WINDOW_SECONDS = 60 * 60 * 24;

interface SessionClaims extends JWTPayload {
  username: string;
  csrf: string;
  sub: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  csrfToken: string;
  issuedAt: string;
  expiresAt: string;
  shouldRefresh: boolean;
}

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ??
    "development-only-auth-secret-change-this-before-production"
  );
}

function getAuthKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

function toSession(claims: SessionClaims): AuthSession | null {
  if (!claims.sub || !claims.username || !claims.csrf) {
    return null;
  }

  const issuedAtSeconds = claims.iat ?? Math.floor(Date.now() / 1000);
  const expiresAtSeconds = claims.exp ?? issuedAtSeconds + SESSION_MAX_AGE_SECONDS;
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    userId: claims.sub,
    username: claims.username,
    csrfToken: claims.csrf,
    issuedAt: new Date(issuedAtSeconds * 1000).toISOString(),
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    shouldRefresh: expiresAtSeconds - nowSeconds <= SESSION_REFRESH_WINDOW_SECONDS,
  };
}

async function createSessionToken(input: {
  userId: string;
  username: string;
  csrfToken: string;
}): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    username: input.username,
    csrf: input.csrfToken,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(getAuthKey());
}

export async function hashAccountPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAccountPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function issueSession(input: {
  userId: string;
  username: string;
}): Promise<{ csrfToken: string; token: string }> {
  const csrfToken = randomBytes(24).toString("base64url");
  const token = await createSessionToken({
    userId: input.userId,
    username: input.username,
    csrfToken,
  });

  return { csrfToken, token };
}

export async function parseSessionToken(
  token: string | null | undefined,
): Promise<AuthSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthKey());
    return toSession(payload as SessionClaims);
  } catch {
    return null;
  }
}

export async function getRequestSession(
  request: Pick<NextRequest, "cookies">,
): Promise<{ refreshedToken: string | null; session: AuthSession | null }> {
  const session = await parseSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!session) {
    return { session: null, refreshedToken: null };
  }

  const refreshedToken = session.shouldRefresh
    ? await createSessionToken({
        userId: session.userId,
        username: session.username,
        csrfToken: session.csrfToken,
      })
    : null;

  return { session, refreshedToken };
}

export function applySessionRefresh(
  response: NextResponse,
  refreshedToken: string | null,
): void {
  if (refreshedToken) {
    setSessionCookie(response, refreshedToken);
  }
}

export async function getOptionalSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requirePageSession(): Promise<AuthSession> {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function redirectAuthenticatedUser(): Promise<void> {
  const session = await getOptionalSession();
  if (session) {
    redirect("/");
  }
}

export function signExportPayload(payload: unknown): string {
  return createHmac("sha256", getAuthSecret())
    .update(JSON.stringify(payload))
    .digest("base64url");
}
