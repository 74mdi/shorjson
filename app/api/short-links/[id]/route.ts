import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { getLink, removeLink } from "@/lib/adapter-utils";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const entry = await getLink(id);

  if (!entry) {
    return jsonWithOptionalRefresh(
      { error: "Link not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  if (entry.userId && entry.userId !== auth.session.userId) {
    return jsonWithOptionalRefresh(
      { error: "Forbidden." },
      { status: 403 },
      auth.refreshedToken,
    );
  }

  await removeLink(id);

  return jsonWithOptionalRefresh(
    { ok: true },
    undefined,
    auth.refreshedToken,
  );
}
