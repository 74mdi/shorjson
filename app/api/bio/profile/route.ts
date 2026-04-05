import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import {
  ensureBioProfileForUser,
  getUserById,
  isBioUsernameAvailable,
  saveBioProfile,
  updateUser,
} from "@/lib/account-data";
import { createSessionRefreshToken, setSessionCookie } from "@/lib/auth";
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

  const existingUser = await getUserById(auth.session.userId);
  if (!existingUser) {
    return jsonWithOptionalRefresh(
      { error: "User not found." },
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

  const updatedAt = new Date().toISOString();
  const updatedProfile = {
    ...existingProfile,
    displayName: parsed.data.displayName,
    username: parsed.data.username,
    bio: parsed.data.bio,
    avatar:
      parsed.data.avatar !== undefined
        ? parsed.data.avatar
        : existingProfile.avatar,
    updatedAt,
  };

  if (existingUser.username !== parsed.data.username) {
    await updateUser({
      ...existingUser,
      username: parsed.data.username,
      updatedAt,
    });
  }

  await saveBioProfile(updatedProfile);

  const response = jsonWithOptionalRefresh(
    updatedProfile,
    undefined,
    auth.refreshedToken,
  );

  if (auth.session.username !== parsed.data.username) {
    const token = await createSessionRefreshToken({
      userId: auth.session.userId,
      username: parsed.data.username,
      csrfToken: auth.session.csrfToken,
    });
    setSessionCookie(response, token);
  }

  return response;
}
