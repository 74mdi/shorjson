import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { deleteBioLink, getBioLinkById, saveBioLink } from "@/lib/account-data";
import { getScopedResourceOwnerId } from "@/lib/account-types";
import { bioLinkUpdateSchema } from "@/lib/schemas";

type Context = { params: Promise<{ slug: string }> };

function forbiddenResponse(refreshedToken: string | null) {
  return jsonWithOptionalRefresh(
    { error: "Forbidden." },
    { status: 403 },
    refreshedToken,
  );
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const { slug } = await params;
  const ownerId = getScopedResourceOwnerId(slug);

  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const link = await getBioLinkById(auth.session.userId, slug);
  if (!link) {
    return jsonWithOptionalRefresh(
      { error: "Link not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(link, undefined, auth.refreshedToken);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const { slug } = await params;
  const ownerId = getScopedResourceOwnerId(slug);

  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const existingLink = await getBioLinkById(auth.session.userId, slug);
  if (!existingLink) {
    return jsonWithOptionalRefresh(
      { error: "Link not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bioLinkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Invalid link.",
        fieldErrors: parsed.error.flatten().fieldErrors,
        formErrors: parsed.error.flatten().formErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  const updatedLink = {
    ...existingLink,
    ...parsed.data,
  };

  await saveBioLink(updatedLink);

  return jsonWithOptionalRefresh(
    updatedLink,
    undefined,
    auth.refreshedToken,
  );
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const { slug } = await params;
  const ownerId = getScopedResourceOwnerId(slug);

  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const existingLink = await getBioLinkById(auth.session.userId, slug);
  if (!existingLink) {
    return jsonWithOptionalRefresh(
      { error: "Link not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  await deleteBioLink(auth.session.userId, slug);

  return jsonWithOptionalRefresh(
    { ok: true },
    undefined,
    auth.refreshedToken,
  );
}
