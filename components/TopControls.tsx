"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

const ExitIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

/* ── TopControls ─────────────────────────────────────────────────────────── */

export default function TopControls({
  auth,
}: {
  auth?: { csrfToken: string; username: string } | null;
}) {
  const router = useRouter();
  const [isDark, setIsDark]     = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

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

  async function handleSignOut() {
    if (!auth || signingOut) return;

    setSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "x-csrf-token": auth.csrfToken },
      });
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <div
        className="fixed top-0 right-0 z-40 flex items-center gap-2"
        style={{ padding: "14px 16px" }}
      >
        {auth ? (
          <div
            className="hidden rounded-full border px-3 py-1.5 text-xs font-medium sm:block"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            @{auth.username}
          </div>
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

        {auth ? (
          <button
            type="button"
            aria-label="Sign out"
            onClick={() => void handleSignOut()}
            style={btnStyle}
            disabled={signingOut}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
              (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
          >
            <ExitIcon />
          </button>
        ) : null}
      </div>
    </>
  );
}
