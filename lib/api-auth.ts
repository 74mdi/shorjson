import { NextResponse, type NextRequest } from "next/server";
import { applySessionRefresh, getRequestSession } from "./auth";
import { verifyCsrf } from "./security";

export async function requireAuthenticatedRequest(
  request: NextRequest,
  options?: { requireCsrf?: boolean },
): Promise<
  | {
      refreshedToken: string | null;
      session: NonNullable<Awaited<ReturnType<typeof getRequestSession>>["session"]>;
    }
  | { response: NextResponse }
> {
  const { session, refreshedToken } = await getRequestSession(request);

  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  if (options?.requireCsrf) {
    const csrfError = verifyCsrf(request, session);
    if (csrfError) {
      applySessionRefresh(csrfError, refreshedToken);
      return { response: csrfError };
    }
  }

  return { session, refreshedToken };
}

export function jsonWithOptionalRefresh(
  body: unknown,
  init: ResponseInit | undefined,
  refreshedToken: string | null,
): NextResponse {
  const response = NextResponse.json(body, init);
  applySessionRefresh(response, refreshedToken);
  return response;
}
