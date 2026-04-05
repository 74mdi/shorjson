import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { ensureBioProfileForUser, saveBioProfile } from "@/lib/account-data";
import { bioStyleSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

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
  const parsed = bioStyleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Invalid style settings.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  const updatedProfile = {
    ...existingProfile,
    buttonStyle: parsed.data.buttonStyle,
    accentColor: parsed.data.accentColor,
    updatedAt: new Date().toISOString(),
  };

  await saveBioProfile(updatedProfile);

  return jsonWithOptionalRefresh(
    updatedProfile,
    undefined,
    auth.refreshedToken,
  );
}
