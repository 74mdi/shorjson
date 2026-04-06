import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { ensureBioProfileForUser, listBioLinks, saveBioLink } from "@/lib/account-data";
import { createScopedResourceId } from "@/lib/account-types";
import { bioLinkCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const links = await listBioLinks(auth.session.userId);

  return jsonWithOptionalRefresh(
    { count: links.length, links },
    undefined,
    auth.refreshedToken,
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bioLinkCreateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Invalid link.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  const existingLinks = await listBioLinks(auth.session.userId);
  const profile = await ensureBioProfileForUser(auth.session.userId);
  if (!profile) {
    return jsonWithOptionalRefresh(
      { error: "Profile not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const nextOrder =
    existingLinks.reduce((highest, link) => Math.max(highest, link.order), -1) +
    1;
  const link = {
    id: createScopedResourceId(auth.session.userId),
    userId: auth.session.userId,
    profileId: profile.id,
    title: parsed.data.title,
    url: parsed.data.url,
    icon: parsed.data.icon,
    iconColor: parsed.data.iconColor,
    section: parsed.data.section || "main",
    visible: parsed.data.visible,
    order: nextOrder,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveBioLink(link);
  } catch (error) {
    return jsonWithOptionalRefresh(
      {
        error:
          error instanceof Error ? error.message : "Unable to create link.",
      },
      { status: 500 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(link, { status: 201 }, auth.refreshedToken);
}
