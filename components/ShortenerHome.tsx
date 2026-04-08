"use client";

import Link from "next/link";
import { useState } from "react";
import LinksList from "./LinksList";
import UrlShortener from "./UrlShortener";
import { getPublicBioPath } from "@/lib/bio-shared";

export default function ShortenerHome({
  username,
}: {
  username: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const publicBioPath = getPublicBioPath(username);

  return (
    <main className="animate-page-fade min-h-dvh px-5 pb-28 pt-12 sm:pt-16">
      <header className="mx-auto w-full max-w-sm animate-morph-in pb-6">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          koki
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Shorten any link with optional slugs and passwords.
        </p>
        <div
          className="mt-3 flex flex-wrap items-center gap-2 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <Link
            href="/dashboard/links"
            className="rounded-full border px-2.5 py-1 transition-colors duration-200"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            Edit bio links
          </Link>
          <Link
            href="/notes"
            className="rounded-full border px-2.5 py-1 transition-colors duration-200"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            Notes
          </Link>
          <Link
            href={publicBioPath}
            className="rounded-full border px-2.5 py-1 transition-colors duration-200"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            View @{username}
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-sm">
        <UrlShortener onShorten={() => setRefreshKey((current) => current + 1)} />
        <LinksList refreshKey={refreshKey} />
      </section>
    </main>
  );
}
