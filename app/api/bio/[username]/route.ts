import { NextRequest, NextResponse } from "next/server";
import { getBioPageByUsername } from "@/lib/bio-page";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const bioPage = await getBioPageByUsername(username);

  if (!bioPage) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(bioPage);
}
