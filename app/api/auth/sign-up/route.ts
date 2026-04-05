import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  issueSession,
  setSessionCookie,
  hashAccountPassword,
} from "@/lib/auth";
import { createUser, getUserByUsername } from "@/lib/account-data";
import { signUpSchema } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

function toFieldErrors(error: ReturnType<typeof signUpSchema.safeParse>) {
  if (error.success) return undefined;
  return error.error.flatten().fieldErrors;
}

export async function POST(request: NextRequest) {
  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Unable to create account.",
        fieldErrors: toFieldErrors(parsed),
      },
      { status: 422 },
    );
  }

  const existingUser = await getUserByUsername(parsed.data.username);
  if (existingUser) {
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  try {
    const user = {
      id: randomUUID(),
      username: parsed.data.username,
      passwordHash: await hashAccountPassword(parsed.data.password),
      createdAt: now,
      updatedAt: now,
    };

    await createUser(user);

    const { token } = await issueSession({
      userId: user.id,
      username: user.username,
    });

    const response = NextResponse.json(
      { user: { id: user.id, username: user.username } },
      { status: 201 },
    );
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 },
    );
  }
}
