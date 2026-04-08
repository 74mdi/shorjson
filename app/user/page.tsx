import type { Metadata } from "next";
import UserSettingsPage from "@/components/UserSettingsPage";
import { ensureBioProfileForUser } from "@/lib/account-data";
import { requirePageSession } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Account - koki",
  description: "Manage your profile, password, preferences, and workspace.",
  path: "/user",
  eyebrow: "Account",
  badge: "Settings",
});

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
