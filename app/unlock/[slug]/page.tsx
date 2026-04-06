import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import UnlockLinkPage from "@/components/UnlockLinkPage";
import { getLinkBySlug } from "@/lib/links";
import {
  getUnlockCookieName,
  hasValidUnlockCookie,
  isPasswordProtected,
} from "@/lib/link-protection";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getLinkBySlug(slug);
  const path = `/unlock/${slug}`;

  if (!entry) {
    return createPageMetadata({
      title: "Protected Link - Shor",
      description: "This protected short link is not available.",
      path,
      eyebrow: "Protected link",
      badge: "Unavailable",
      ogTitle: "Protected Link",
    });
  }

  return createPageMetadata({
    title: `Unlock /${slug} - Shor`,
    description: "Enter the password to continue to this protected short link.",
    path,
    eyebrow: "Protected link",
    badge: "Locked",
    ogTitle: `Unlock /${slug}`,
  });
}

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
    />
  );
}
