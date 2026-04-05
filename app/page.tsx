"use client";

import { useState } from "react";
import UrlShortener from "@/components/UrlShortener";
import LinksList from "@/components/LinksList";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-16">
      {/* ── Site name header ── */}
      <header className="w-full max-w-sm pt-12 pb-6 animate-morph-in">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Shor
          <span
            className="inline-block w-1.5 h-1.5 rounded-full ml-0.5 mb-2 align-bottom"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          />
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Shorten any link, instantly.
        </p>
      </header>

      {/* ── Shortener form ── */}
      <div className="w-full max-w-sm animate-morph-in delay-100">
        <UrlShortener onShorten={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* ── All links ── */}
      <div className="w-full max-w-sm">
        <LinksList refreshKey={refreshKey} />
      </div>
    </main>
  );
}
