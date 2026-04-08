import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { clearSessionCookie, verifyAccountPassword } from "@/lib/auth";
import { deleteUserAccount, getUserById } from "@/lib/account-data";
import { accountDeleteSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
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
  const parsed = accountDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithOptionalRefresh(
      {
        error: "Unable to delete account.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
      auth.refreshedToken,
    );
  }

  if (parsed.data.username !== user.username.toLowerCase()) {
    return jsonWithOptionalRefresh(
      {
        error: "Type your exact username to continue.",
        fieldErrors: {
          username: ["Type your exact username to continue."],
        },
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

  await deleteUserAccount(user.id);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
