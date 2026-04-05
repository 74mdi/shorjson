"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DbPanel from "@/components/DbPanel";

/* ── Icons (16×16) ──────────────────────────────────────────────────────── */

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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

/* ── Tab button ──────────────────────────────────────────────────────────── */

function TabBtn({
  label,
  active,
  onClick,
  href,
  children,
  badge,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  badge?: boolean;
}) {
  const inner = (
    <span className="relative flex flex-col items-center justify-center gap-[3px]"
      style={{ minWidth: 52, padding: "8px 10px", borderRadius: 12,
        background: active ? "var(--surface-raised)" : "transparent",
        transition: "background 0.18s ease",
      }}>
      <span className="relative" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>
        {children}
        {badge && (
          <span className="absolute -top-[3px] -right-[3px] w-[6px] h-[6px] rounded-full"
            style={{ background: "var(--text)", border: "1.5px solid var(--bg)" }}
            aria-hidden="true" />
        )}
      </span>
      <span className="text-[9px] font-medium tracking-wide select-none"
        style={{ color: active ? "var(--text)" : "var(--text-muted)", transition: "color 0.18s ease" }}>
        {label}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label}
        className="flex items-center justify-center active:scale-95 transition-transform duration-100"
        style={{ textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="flex items-center justify-center active:scale-95 transition-transform duration-100">
      {inner}
    </button>
  );
}

/* ── BottomBar ───────────────────────────────────────────────────────────── */

export default function BottomBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasCustomDb, setHasCustomDb] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/db-connections")
      .then((r) => r.json())
      .then((d) => {
        const conns = (d.connections ?? []) as Array<{ isActive: boolean }>;
        setHasCustomDb(conns.some((c) => c.isActive));
      })
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("shor-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("shor-mode", "light");
    }
  }

  function handleClose() {
    setOpen(false);
    fetch("/api/db-connections")
      .then((r) => r.json())
      .then((d) => {
        const conns = (d.connections ?? []) as Array<{ isActive: boolean }>;
        setHasCustomDb(conns.some((c) => c.isActive));
      })
      .catch(() => {});
  }

  return (
    <>
      {/* Floating pill bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center animate-fade-in"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div
          className="flex items-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            boxShadow: "0 4px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "4px",
            gap: 2,
          }}
        >
          <TabBtn href="/" label="Links" active={pathname === "/"}>
            <LinkIcon />
          </TabBtn>

          <TabBtn href="/notes" label="Notes" active={pathname === "/notes"}>
            <PencilIcon />
          </TabBtn>

          {/* Thin divider */}
          <span
            className="self-stretch mx-0.5"
            style={{ width: 1, background: "var(--border)", borderRadius: 1 }}
            aria-hidden="true"
          />

          <TabBtn
            label={isDark ? "Light" : "Dark"}
            onClick={toggleTheme}
            active={false}
          >
            {mounted ? (
              <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
                <span className="absolute transition-all duration-300"
                  style={{ opacity: isDark ? 1 : 0, transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.4)" }}>
                  <SunIcon />
                </span>
                <span className="absolute transition-all duration-300"
                  style={{ opacity: isDark ? 0 : 1, transform: isDark ? "rotate(-90deg) scale(0.4)" : "rotate(0deg) scale(1)" }}>
                  <MoonIcon />
                </span>
              </span>
            ) : (
              <MoonIcon />
            )}
          </TabBtn>

          <TabBtn label="Settings" onClick={() => setOpen(true)} badge={hasCustomDb}>
            <SettingsIcon />
          </TabBtn>
        </div>
      </div>

      <DbPanel open={open} onClose={handleClose} />
    </>
  );
}
