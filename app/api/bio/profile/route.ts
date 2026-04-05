import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import {
  ensureBioProfileForUser,
  isBioUsernameAvailable,
  saveBioProfile,
} from "@/lib/account-data";
import { bioProfileSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("response" in auth) return auth.response;

  const profile = await ensureBioProfileForUser(auth.session.userId);
  if (!profile) {
    return jsonWithOptionalRefresh(
      { error: "Profile not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  return jsonWithOptionalRefresh(profile, undefined, auth.refreshedToken);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const existingProfile = await ensureBioProfileForUser(auth.session.userId);
  if (!existingProfile) {
    return jsonWithOptionalRefresh(
      { error: "Profile not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bioProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Invalid profile.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  const available = await isBioUsernameAvailable(
    parsed.data.username,
    auth.session.userId,
  );
  if (!available) {
    return jsonWithOptionalRefresh(
      {
        error: "Username unavailable.",
        fieldErrors: { username: ["That username is already taken."] },
      },
      { status: 409 },
      auth.refreshedToken,
    );
  }

  const updatedProfile = {
    ...existingProfile,
    displayName: parsed.data.displayName,
    username: parsed.data.username,
    bio: parsed.data.bio,
    avatar:
      parsed.data.avatar !== undefined
        ? parsed.data.avatar
        : existingProfile.avatar,
    updatedAt: new Date().toISOString(),
  };

  await saveBioProfile(updatedProfile);

  return jsonWithOptionalRefresh(
    updatedProfile,
    undefined,
    auth.refreshedToken,
  );
}
