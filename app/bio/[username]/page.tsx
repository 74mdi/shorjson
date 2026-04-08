import type { Metadata } from "next";
import InvalidBioProfilePage from "@/components/InvalidBioProfilePage";
import PublicBioPage from "@/components/PublicBioPage";
import { geistMono, instrumentSerif } from "@/lib/fonts";
import { getBioPageByUsername } from "@/lib/bio-page";
import { getPublicBioPath } from "@/lib/bio-shared";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const bioPage = await getBioPageByUsername(username);
  const publicPath = getPublicBioPath(username);

  if (bioPage) {
    return createPageMetadata({
      title: `${bioPage.displayName} (@${bioPage.username}) - koki`,
      description: bioPage.bio || `Links from @${bioPage.username}`,
      path: publicPath,
      eyebrow: "Public profile",
      badge: `@${bioPage.username}`,
      ogTitle: `${bioPage.displayName} · @${bioPage.username}`,
    });
  }

  return createPageMetadata({
    title: "Invalid profile - koki",
    description: `The profile @${username} does not exist or is not available.`,
    path: publicPath,
    eyebrow: "Public profile",
    badge: "Unavailable",
    ogTitle: `@${username}`,
  });
}

export default async function BioUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const bioPage = await getBioPageByUsername(username);

  return (
    <div className={`${instrumentSerif.variable} ${geistMono.variable}`}>
      {bioPage ? (
        <PublicBioPage page={bioPage} />
      ) : (
        <InvalidBioProfilePage username={username || "unknown"} />
      )}
    </div>
  );
}
