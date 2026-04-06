import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import {
  deletePrivateNote,
  getPrivateNoteById,
  savePrivateNote,
} from "@/lib/account-data";
import { getScopedResourceOwnerId } from "@/lib/account-types";
import { noteUpdateSchema } from "@/lib/schemas";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function forbiddenResponse(refreshedToken: string | null) {
  return jsonWithOptionalRefresh(
    { error: "Forbidden." },
    { status: 403 },
    refreshedToken,
  );
}

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const ownerId = getScopedResourceOwnerId(id);
  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const note = await getPrivateNoteById(auth.session.userId, id);
  if (!note) {
    return jsonWithOptionalRefresh(
      { error: "Note not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(note, undefined, auth.refreshedToken);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const ownerId = getScopedResourceOwnerId(id);
  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const existingNote = await getPrivateNoteById(auth.session.userId, id);
  if (!existingNote) {
    return jsonWithOptionalRefresh(
      { error: "Note not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = noteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Invalid note.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  // Handle slug uniqueness if one is provided
  if (parsed.data.slug) {
    const slugOwner = await import("@/lib/account-data").then(m => m.getPrivateNoteBySlug(parsed.data.slug!));
    if (slugOwner && slugOwner.id !== existingNote.id) {
      return jsonWithOptionalRefresh(
        { error: "Slug is already taken by another note." },
        { status: 409 },
        auth.refreshedToken
      );
    }
  }

  let passwordHash = existingNote.passwordHash;
  let passwordSalt = existingNote.passwordSalt;
  if (parsed.data.password === "") {
    passwordHash = undefined;
    passwordSalt = undefined;
  } else if (parsed.data.password) {
    const { hashLinkPassword } = await import("@/lib/link-protection");
    const hashed = await hashLinkPassword(parsed.data.password);
    passwordHash = hashed.passwordHash;
    passwordSalt = hashed.passwordSalt;
  }

  const updatedNote = {
    ...existingNote,
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.content !== undefined
      ? { content: parsed.data.content }
      : {}),
    ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
    ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
    passwordHash,
    passwordSalt,
    updatedAt: new Date().toISOString(),
  };

  try {
    await savePrivateNote(updatedNote);
  } catch (error) {
    return jsonWithOptionalRefresh(
      {
        error: error instanceof Error ? error.message : "Unable to save note.",
      },
      { status: 500 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(
    updatedNote,
    undefined,
    auth.refreshedToken,
  );
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const ownerId = getScopedResourceOwnerId(id);
  if (ownerId && ownerId !== auth.session.userId) {
    return forbiddenResponse(auth.refreshedToken);
  }

  const existingNote = await getPrivateNoteById(auth.session.userId, id);
  if (!existingNote) {
    return jsonWithOptionalRefresh(
      { error: "Note not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  try {
    await deletePrivateNote(auth.session.userId, id);
  } catch (error) {
    return jsonWithOptionalRefresh(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete note.",
      },
      { status: 500 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(
    { ok: true },
    undefined,
    auth.refreshedToken,
  );
}
