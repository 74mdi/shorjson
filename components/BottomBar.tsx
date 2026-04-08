"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── Icons ──────────────────────────────────────────────────────────────── */

const LinkIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const AtIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a2 2 0 1 0 4 0 8 8 0 1 0-3.4 6.56" />
  </svg>
);

const PencilIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ProfileIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 21a6 6 0 0 0-12 0" />
    <circle cx="12" cy="8" r="4" />
  </svg>
);

/* ── Nav tabs ────────────────────────────────────────────────────────────── */

const NAV_TABS = [
  {
    href: "/",
    label: "Shortener",
    Icon: LinkIcon,
    matches: (pathname: string) => pathname === "/",
  },
  {
    href: "/dashboard/links",
    label: "Bio Links",
    Icon: AtIcon,
    matches: (pathname: string) => pathname.startsWith("/dashboard/links"),
  },
  {
    href: "/notes",
    label: "Notes",
    Icon: PencilIcon,
    matches: (pathname: string) => pathname.startsWith("/notes"),
  },
  {
    href: "/user",
    label: "Profile",
    Icon: ProfileIcon,
    matches: (pathname: string) => pathname.startsWith("/user"),
  },
] as const;

/* ── BottomBar ───────────────────────────────────────────────────────────── */

export default function BottomBar({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const pathname = usePathname();
  const activeIdx = NAV_TABS.findIndex((tab) => tab.matches(pathname));

  if (!authenticated || activeIdx < 0) return null;

  return (
    <div
      data-print-hidden="true"
      className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(12px, env(safe-area-inset-left))",
        paddingRight: "max(12px, env(safe-area-inset-right))",
      }}
    >
      <div
        className="pointer-events-auto w-full max-w-[380px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "5px",
        }}
      >
        {/* Nav tabs with sliding indicator */}
        <div className="relative flex items-center" style={{ borderRadius: 18 }}>
          {/* Sliding pill indicator */}
          {activeIdx >= 0 && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `calc(100% / ${NAV_TABS.length})`,
                height: "100%",
                borderRadius: 18,
                background: "var(--accent)",
                transform: `translateX(${activeIdx * 100}%)`,
                transition: "transform 0.42s cubic-bezier(0.34, 1.42, 0.64, 1)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

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
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
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
      </div>
    </div>
  );
}
