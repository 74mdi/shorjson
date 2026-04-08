import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { clickLink } from "@/lib/adapter-utils";
import { getLinkBySlug } from "@/lib/links";
import {
  getUnlockCookieName,
  hasValidUnlockCookie,
  isPasswordProtected,
} from "@/lib/link-protection";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

function isExpiredLink(expiresAt?: string | null): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug}`;
  const entry = await getLinkBySlug(slug);

  if (!entry) {
    return {
      ...createPageMetadata({
        title: `/${slug} - koki`,
        description: "This short link is not available.",
        path,
        eyebrow: "Short link",
        badge: "Unavailable",
        ogTitle: `/${slug}`,
      }),
      robots: { index: false },
    };
  }

  if (isPasswordProtected(entry)) {
    return {
      ...createPageMetadata({
        title: `/${slug} - Protected Link - koki`,
        description: "Password-protected short link hosted on koki.",
        path,
        eyebrow: "Protected link",
        badge: "Locked",
        ogTitle: `/${slug}`,
      }),
      robots: { index: false },
    };
  }

  const clickLabel =
    entry.clicks > 0
      ? `${entry.clicks} click${entry.clicks === 1 ? "" : "s"}`
      : "Live";

  return createPageMetadata({
    title: `/${slug} - koki`,
    description: "Short link hosted on koki.",
    path,
    eyebrow: "Short link",
    badge: clickLabel,
    ogTitle: `/${slug}`,
  });
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const entry = await getLinkBySlug(slug);
  if (!entry) {
    notFound();
  }

  if (
    typeof entry.clickLimit === "number" &&
    entry.clickLimit >= 0 &&
    entry.clicks >= entry.clickLimit
  ) {
    return (
      <main className="min-h-dvh px-5 pb-16 pt-24">
        <div
          className="mx-auto max-w-sm rounded-3xl border p-6 text-center"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
          }}
        >
          <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Link unavailable
          </div>
          <p className="pt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            This short link reached its click limit and is no longer accepting visits.
          </p>
        </div>
      </main>
    );
  }

  // Check expiration
  if (isExpiredLink(entry.expiresAt)) {
    return (
      <main className="min-h-dvh px-5 pb-16 pt-24">
        <div
          className="mx-auto max-w-sm rounded-3xl border p-6 text-center"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
          }}
        >
          <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Link expired
          </div>
          <p className="pt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            This short link has expired and is no longer available.
          </p>
        </div>
      </main>
    );
  }

  if (isPasswordProtected(entry)) {
    const cookieStore = await cookies();
    const unlockCookie = cookieStore.get(getUnlockCookieName(slug))?.value;

    if (!hasValidUnlockCookie(slug, entry, unlockCookie)) {
      redirect(`/unlock/${encodeURIComponent(slug)}`);
    }
  }

  await clickLink(slug);

  redirect(entry.originalUrl);
}
