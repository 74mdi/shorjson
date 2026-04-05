import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import UnlockLinkPage from "@/components/UnlockLinkPage";
import { getLinkBySlug, getLinkDestinationLabel } from "@/lib/links";
import {
  getUnlockCookieName,
  hasValidUnlockCookie,
  isPasswordProtected,
} from "@/lib/link-protection";

export const dynamic = "force-dynamic";

export default async function UnlockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getLinkBySlug(slug);

  if (!entry) {
    notFound();
  }

  if (!isPasswordProtected(entry)) {
    redirect(`/${slug}`);
  }

  const cookieStore = await cookies();
  const unlockCookie = cookieStore.get(getUnlockCookieName(slug))?.value;

  if (hasValidUnlockCookie(slug, entry, unlockCookie)) {
    redirect(`/${slug}`);
  }

  return (
    <UnlockLinkPage
      slug={slug}
      destinationLabel={getLinkDestinationLabel(entry.originalUrl)}
    />
  );
}
