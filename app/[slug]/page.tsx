import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PublicBioPage from "@/components/PublicBioPage";
import { geistMono, instrumentSerif } from "@/lib/fonts";
import { getBioPageByUsername } from "@/lib/bio-page";
import { clickLink, getLinks } from "@/lib/adapter-utils";
import { getLinkBySlug } from "@/lib/links";
import {
  getUnlockCookieName,
  hasValidUnlockCookie,
  isPasswordProtected,
} from "@/lib/link-protection";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bioPage = await getBioPageByUsername(slug);

  if (bioPage) {
    return {
      title: `${bioPage.displayName} (@${bioPage.username}) - Shor`,
      description: bioPage.bio || `Links from @${bioPage.username}`,
    };
  }

  return {
    title: `/${slug} - Shor`,
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bioPage = await getBioPageByUsername(slug);

  if (bioPage) {
    return (
      <div className={`${instrumentSerif.variable} ${geistMono.variable}`}>
        <PublicBioPage page={bioPage} />
      </div>
    );
  }

  const entry = await getLinkBySlug(slug);
  if (!entry) {
    notFound();
  }

  if (isPasswordProtected(entry)) {
    const cookieStore = await cookies();
    const unlockCookie = cookieStore.get(getUnlockCookieName(slug))?.value;

    if (!hasValidUnlockCookie(slug, entry, unlockCookie)) {
      redirect(`/unlock/${encodeURIComponent(slug)}`);
    }
  }

  const localLinks = await getLinks();
  if (localLinks[slug]) {
    await clickLink(slug, localLinks);
  }

  redirect(entry.originalUrl);
}
