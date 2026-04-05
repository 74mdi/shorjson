"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DbPanel from "@/components/DbPanel";

/* ── Icons ──────────────────────────────────────────────────────────────── */

const LinkIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PencilIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const SettingsIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SunIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ── Constants ───────────────────────────────────────────────────────────── */

const NAV_TABS = [
  { href: "/",      label: "Links",  Icon: LinkIcon },
  { href: "/notes", label: "Notes",  Icon: PencilIcon },
];

const TAB_W = 72; // px — each nav tab width (pill indicator matches this)

/* ── BottomBar ───────────────────────────────────────────────────────────── */

export default function BottomBar() {
  const pathname  = usePathname();
  const [open, setOpen]           = useState(false);
  const [hasCustomDb, setHasDb]   = useState(false);
  const [isDark, setIsDark]       = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/db-connections")
      .then(r => r.json())
      .then((d: { connections?: Array<{ isActive: boolean }> }) => {
        setHasDb((d.connections ?? []).some(c => c.isActive));
      })
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("shor-mode", next ? "dark" : "light");
  }

  function handleClose() {
    setOpen(false);
    fetch("/api/db-connections")
      .then(r => r.json())
      .then((d: { connections?: Array<{ isActive: boolean }> }) => {
        setHasDb((d.connections ?? []).some(c => c.isActive));
      })
      .catch(() => {});
  }

  // Active nav index (0 = Links, 1 = Notes, -1 = neither)
  const activeIdx = NAV_TABS.findIndex(t => t.href === pathname);

  return (
    <>
      {/* Floating bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none animate-fade-in"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div
          className="flex items-center pointer-events-auto"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            padding: "5px 6px",
            gap: 2,
          }}
        >
          {/* ── Nav tabs with sliding indicator ── */}
          <div className="relative flex items-center" style={{ borderRadius: 18 }}>
            {/* Sliding pill indicator */}
            {activeIdx >= 0 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: TAB_W,
                  height: "100%",
                  borderRadius: 18,
                  background: "var(--accent)",
                  transform: `translateX(${activeIdx * TAB_W}px)`,
                  transition: "transform 0.42s cubic-bezier(0.34, 1.42, 0.64, 1)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            )}

            {/* Tabs */}
            {NAV_TABS.map((tab, i) => {
              const isActive = i === activeIdx;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: TAB_W,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    padding: "10px 0",
                    borderRadius: 18,
                    textDecoration: "none",
                    color: isActive ? "var(--bg)" : "var(--text-muted)",
                    transition: "color 0.25s ease",
                  }}
                >
                  <tab.Icon size={17} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateY(0) scale(1)" : "translateY(4px) scale(0.85)",
                      transition: "opacity 0.25s ease, transform 0.25s ease",
                      lineHeight: 1,
                    }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: 28,
              background: "var(--border)",
              borderRadius: 1,
              margin: "0 4px",
              flexShrink: 0,
            }}
          />

          {/* ── Theme toggle ── */}
          <button
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            style={{
              width: 52,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "10px 0",
              borderRadius: 18,
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            {mounted ? (
              <span style={{ position: "relative", width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{
                  position: "absolute",
                  transition: "opacity 0.3s, transform 0.3s",
                  opacity: isDark ? 1 : 0,
                  transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)",
                }}>
                  <SunIcon />
                </span>
                <span style={{
                  position: "absolute",
                  transition: "opacity 0.3s, transform 0.3s",
                  opacity: isDark ? 0 : 1,
                  transform: isDark ? "rotate(-90deg) scale(0.5)" : "rotate(0deg) scale(1)",
                }}>
                  <MoonIcon />
                </span>
              </span>
            ) : (
              <MoonIcon />
            )}
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.02em", opacity: 0, lineHeight: 1 }} aria-hidden="true">
              Mode
            </span>
          </button>

          {/* ── Settings ── */}
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setOpen(true)}
            style={{
              position: "relative",
              width: 52,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "10px 0",
              borderRadius: 18,
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <SettingsIcon />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.02em", opacity: 0, lineHeight: 1 }} aria-hidden="true">
              Settings
            </span>
            {hasCustomDb && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--text)",
                  border: "1.5px solid var(--surface)",
                }}
              />
            )}
          </button>
        </div>
      </div>

      <DbPanel open={open} onClose={handleClose} />
    </>
  );
}
