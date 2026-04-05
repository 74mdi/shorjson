import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthSession } from "./auth";

const signInRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 15,
});

function getRequestOrigin(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = forwardedProto ?? request.nextUrl.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function verifySameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  return origin === getRequestOrigin(request)
    ? null
    : NextResponse.json({ error: "Invalid request." }, { status: 403 });
}

export function verifyCsrf(
  request: NextRequest,
  session: AuthSession,
): NextResponse | null {
  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const csrfToken = request.headers.get("x-csrf-token");
  if (!csrfToken || csrfToken !== session.csrfToken) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  return null;
}

export async function enforceSignInRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    await signInRateLimiter.consume(getClientIp(request));
    return null;
  } catch (error) {
    const retryAfterSeconds =
      typeof error === "object" &&
      error !== null &&
      "msBeforeNext" in error &&
      typeof error.msBeforeNext === "number"
        ? Math.ceil(error.msBeforeNext / 1000)
        : 60;

    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }
}
