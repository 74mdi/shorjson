import { NextRequest } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { getUserById, updateUser } from "@/lib/account-data";
import {
  hashAccountPassword,
  verifyAccountPassword,
} from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const user = await getUserById(auth.session.userId);
  if (!user) {
    return jsonWithOptionalRefresh(
      { error: "User not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Unable to update password.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  const passwordMatches = await verifyAccountPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return jsonWithOptionalRefresh(
      {
        error: "Current password is incorrect.",
        fieldErrors: {
          currentPassword: ["Current password is incorrect."],
        },
      },
      { status: 401 },
      auth.refreshedToken,
    );
  }

  const updatedAt = new Date().toISOString();

  await updateUser({
    ...user,
    passwordHash: await hashAccountPassword(parsed.data.newPassword),
    updatedAt,
  });

  return jsonWithOptionalRefresh(
    { ok: true },
    undefined,
    auth.refreshedToken,
  );
}
