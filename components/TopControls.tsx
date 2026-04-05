"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPublicBioPath } from "@/lib/bio-shared";

/* ── Icons ──────────────────────────────────────────────────────────────── */

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ── TopControls ─────────────────────────────────────────────────────────── */

export default function TopControls({
  auth,
}: {
  auth?: { username: string } | null;
}) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const singleSegmentPath =
    pathname !== "/" && /^\/[^/]+$/.test(pathname) ? pathname.slice(1) : null;
  const shouldHide =
    !auth ||
    pathname.startsWith("/dashboard/links") ||
    pathname === "/user" ||
    (singleSegmentPath !== null &&
      !["notes", "sign-in", "sign-up", "user"].includes(singleSegmentPath));

  if (shouldHide) {
    return null;
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("shor-mode", next ? "dark" : "light");
  }

  const btnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "color 0.15s, background 0.15s",
    position: "relative",
  };

  return (
    <>
      <div
        className="fixed top-0 right-0 z-40 flex items-center gap-2"
        style={{ padding: "14px 16px" }}
      >
        {auth ? (
          <Link
            href="/user"
            className="hidden rounded-full border px-3 py-1.5 text-xs font-medium sm:block"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            @{auth.username}
          </Link>
        ) : null}

        {/* Theme toggle */}
        <button
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
          style={btnStyle}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
        >
          {mounted ? (
            <span style={{ position: "relative", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{
                position: "absolute",
                transition: "opacity 0.25s, transform 0.25s",
                opacity: isDark ? 1 : 0,
                transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.4)",
              }}>
                <SunIcon />
              </span>
              <span style={{
                position: "absolute",
                transition: "opacity 0.25s, transform 0.25s",
                opacity: isDark ? 0 : 1,
                transform: isDark ? "rotate(-90deg) scale(0.4)" : "rotate(0deg) scale(1)",
              }}>
                <MoonIcon />
              </span>
            </span>
          ) : (
            <MoonIcon />
          )}
        </button>

        <Link
          href={getPublicBioPath(auth.username)}
          aria-label="Open public bio page"
          style={btnStyle}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
        >
          @
        </Link>
      </div>
    </>
  );
}
