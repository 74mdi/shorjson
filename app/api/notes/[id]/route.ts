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

  const updatedNote = {
    ...existingNote,
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.content !== undefined
      ? { content: parsed.data.content }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  await savePrivateNote(updatedNote);

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

  await deletePrivateNote(auth.session.userId, id);

  return jsonWithOptionalRefresh(
    { ok: true },
    undefined,
    auth.refreshedToken,
  );
}
