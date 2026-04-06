import type { Metadata } from "next";
import BioLinksDashboard from "@/components/BioLinksDashboard";
import { ensureBioProfileForUser, listBioLinks } from "@/lib/account-data";
import { requirePageSession } from "@/lib/auth";
import { geistMono, instrumentSerif } from "@/lib/fonts";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Links Dashboard - Shor",
  description: "Edit your public bio page, customize its style, and manage your links.",
  path: "/dashboard/links",
  eyebrow: "Dashboard",
  badge: "Bio links",
});

export default async function DashboardLinksPage() {
  const session = await requirePageSession();
  const [profile, links] = await Promise.all([
    ensureBioProfileForUser(session.userId),
    listBioLinks(session.userId),
  ]);

  if (!profile) {
    return null;
  }

  return (
    <div className={`${instrumentSerif.variable} ${geistMono.variable}`}>
      <BioLinksDashboard
        csrfToken={session.csrfToken}
        initialLinks={links}
        initialProfile={profile}
      />
    </div>
  );
}
