import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { getLinks } from "@/lib/adapter-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const links = await getLinks();
  const recentLinks = Object.entries(links)
    .filter(([, entry]) => entry.userId === auth.session.userId)
    .map(([shortId, entry]) => ({
      shortId,
      originalUrl: entry.originalUrl,
      createdAt: entry.createdAt,
      clicks: entry.clicks,
      hasPassword: Boolean(entry.passwordHash),
      clickLimit: entry.clickLimit ?? null,
    }))
    .sort((left, right) => {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 12);

  return jsonWithOptionalRefresh(
    {
      count: recentLinks.length,
      links: recentLinks,
    },
    undefined,
    auth.refreshedToken,
  );
}
