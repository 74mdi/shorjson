import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { listPrivateNotes, savePrivateNote } from "@/lib/account-data";
import { createScopedResourceId } from "@/lib/account-types";
import { noteCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const notes = await listPrivateNotes(auth.session.userId);

  return jsonWithOptionalRefresh(
    { count: notes.length, notes },
    undefined,
    auth.refreshedToken,
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = noteCreateSchema.safeParse(body);

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

  const now = new Date().toISOString();
  const note = {
    id: createScopedResourceId(auth.session.userId),
    userId: auth.session.userId,
    title: parsed.data.title,
    content: parsed.data.content,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await savePrivateNote(note);
  } catch (error) {
    return jsonWithOptionalRefresh(
      {
        error:
          error instanceof Error ? error.message : "Unable to create note.",
      },
      { status: 500 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(note, { status: 201 }, auth.refreshedToken);
}
