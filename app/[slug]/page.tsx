import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
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
