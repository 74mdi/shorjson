"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DbPanel from "@/components/DbPanel";

/* ── Icons ──────────────────────────────────────────────────────────────── */

const LinkIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PencilIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const SunIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ── Nav link helper ─────────────────────────────────────────────────────── */

function NavBtn({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-[6px] transition-all duration-150"
      style={{
        width: 28,
        height: 28,
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--surface-raised)" : "transparent",
        border: active ? "1px solid var(--border)" : "1px solid transparent",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
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
    // Refresh badge
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
      {/* Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: "var(--bg)" }}
        >
          {/* Left: nav links */}
          <div className="flex items-center gap-1">
            <NavBtn href="/" label="Links" active={pathname === "/"}>
              <LinkIcon />
            </NavBtn>
            <NavBtn href="/notes" label="Notes" active={pathname === "/notes"}>
              <PencilIcon />
            </NavBtn>
          </div>

          {/* Right: theme toggle + DB button */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              type="button"
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              onClick={toggleTheme}
              className="relative flex items-center justify-center rounded-[6px] transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                width: 28,
                height: 28,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              {mounted ? (
                <span
                  className="relative flex items-center justify-center"
                  style={{ width: 13, height: 13 }}
                >
                  {/* Sun: visible when isDark (click to go light) */}
                  <span
                    className="absolute transition-all duration-350"
                    style={{
                      opacity: isDark ? 1 : 0,
                      transform: isDark
                        ? "rotate(0deg) scale(1)"
                        : "rotate(90deg) scale(0.4)",
                    }}
                  >
                    <SunIcon />
                  </span>
                  {/* Moon: visible when !isDark (click to go dark) */}
                  <span
                    className="absolute transition-all duration-350"
                    style={{
                      opacity: isDark ? 0 : 1,
                      transform: isDark
                        ? "rotate(-90deg) scale(0.4)"
                        : "rotate(0deg) scale(1)",
                    }}
                  >
                    <MoonIcon />
                  </span>
                </span>
              ) : (
                <MoonIcon />
              )}
            </button>

            {/* DB button (unchanged) */}
            <button
              type="button"
              aria-label="Databases and settings"
              title="Databases and settings"
              onClick={() => setOpen(true)}
              className="relative flex items-center justify-center rounded-[6px] transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                width: 28,
                height: 28,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <DatabaseIcon />
              {hasCustomDb && (
                <span
                  className="absolute -top-[3px] -right-[3px] w-[7px] h-[7px] rounded-full"
                  style={{
                    background: "var(--text)",
                    border: "1.5px solid var(--bg)",
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Panel */}
      <DbPanel open={open} onClose={handleClose} />
    </>
  );
}
