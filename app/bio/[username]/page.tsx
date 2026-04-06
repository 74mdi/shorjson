import type { Metadata } from "next";
import InvalidBioProfilePage from "@/components/InvalidBioProfilePage";
import PublicBioPage from "@/components/PublicBioPage";
import { geistMono, instrumentSerif } from "@/lib/fonts";
import { getBioPageByUsername } from "@/lib/bio-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const bioPage = await getBioPageByUsername(username);

  if (bioPage) {
    return {
      title: `${bioPage.displayName} (@${bioPage.username}) - Shor`,
      description: bioPage.bio || `Links from @${bioPage.username}`,
    };
  }

  return {
    title: "Invalid profile - Shor",
    description: `The profile @${username} does not exist or is not available.`,
  };
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
