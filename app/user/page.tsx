import type { Metadata } from "next";
import UserSettingsPage from "@/components/UserSettingsPage";
import { ensureBioProfileForUser } from "@/lib/account-data";
import { requirePageSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account - Shor",
  description: "Manage your profile, password, preferences, and workspace.",
};

export default async function UserPage() {
  const session = await requirePageSession();
  const profile = await ensureBioProfileForUser(session.userId);

  if (!profile) {
    return null;
  }

  return (
    <UserSettingsPage
      csrfToken={session.csrfToken}
      initialProfile={profile}
      username={session.username}
    />
  );
}
