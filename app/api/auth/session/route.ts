import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  return jsonWithOptionalRefresh(
    {
      user: {
        id: auth.session.userId,
        username: auth.session.username,
      },
      csrfToken: auth.session.csrfToken,
    },
    undefined,
    auth.refreshedToken,
  );
}
