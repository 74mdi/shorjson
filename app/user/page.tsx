import type { Metadata } from "next";
import UserSettingsPage from "@/components/UserSettingsPage";
import { requirePageSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "User - Shor",
  description: "Account tools, shortcuts, and settings.",
};

export default async function UserPage() {
  const session = await requirePageSession();

  return (
    <UserSettingsPage
      csrfToken={session.csrfToken}
      username={session.username}
    />
  );
}
