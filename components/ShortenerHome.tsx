"use client";

import Link from "next/link";
import { useState } from "react";
import LinksList from "./LinksList";
import UrlShortener from "./UrlShortener";

export default function ShortenerHome({
  username,
}: {
  username: string | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-dvh px-5 pb-28 pt-12 sm:pt-16">
      <header className="mx-auto w-full max-w-sm animate-morph-in pb-6">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          Shor
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Shorten any link with optional slugs and passwords.
        </p>
        {username ? (
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
              href={`/${username}`}
              className="rounded-full border px-2.5 py-1 transition-colors duration-200"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              View /{username}
            </Link>
          </div>
        ) : null}
      </header>

      <section className="mx-auto w-full max-w-sm">
        <UrlShortener onShorten={() => setRefreshKey((current) => current + 1)} />
        <LinksList refreshKey={refreshKey} />
      </section>
    </main>
  );
}
