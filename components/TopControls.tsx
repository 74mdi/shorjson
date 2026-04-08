"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getPublicBioPath } from "@/lib/bio-shared";
import { applyTheme, getCurrentThemeIsDark, subscribeToTheme } from "@/lib/theme-client";

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

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function getHoverHandlers(baseColor: string, hoverColor: string, baseBackground: string, hoverBackground: string) {
  return {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      event.currentTarget.style.color = hoverColor;
      event.currentTarget.style.background = hoverBackground;
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      event.currentTarget.style.color = baseColor;
      event.currentTarget.style.background = baseBackground;
    },
  };
}

/* ── TopControls ─────────────────────────────────────────────────────────── */

export default function TopControls({
  auth,
}: {
  auth?: { csrfToken: string; username: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showGuestLinks =
    !auth &&
    (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up");

  useEffect(() => {
    setIsDark(getCurrentThemeIsDark());
    setMounted(true);

    return subscribeToTheme((nextIsDark) => {
      setIsDark(nextIsDark);
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  async function handleSignOut() {
    if (!auth || signingOut) return;
    setSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "x-csrf-token": auth.csrfToken,
        },
      });
      setMenuOpen(false);
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const guestLinks = [
    {
      href: "/sign-in",
      label: "Sign in",
    },
    {
      href: "/sign-up",
      label: "Create account",
    },
  ].filter((link) => link.href !== pathname);

  const accountLinks = auth
    ? [
        {
          href: "/",
          isActive: pathname === "/",
          label: "Shortener",
        },
        {
          href: "/dashboard/links",
          isActive: pathname.startsWith("/dashboard/links"),
          label: "Bio links",
        },
        {
          href: "/notes",
          isActive: pathname.startsWith("/notes"),
          label: "Notes",
        },
        {
          href: "/user",
          isActive: pathname.startsWith("/user"),
          label: "Account",
        },
        {
          href: getPublicBioPath(auth.username),
          isActive: pathname === getPublicBioPath(auth.username),
          label: "Public page",
        },
      ]
    : [];

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    transition: "color 0.15s, background 0.15s",
    position: "relative",
  };

  const pillHoverHandlers = getHoverHandlers(
    "var(--text-muted)",
    "var(--text)",
    "var(--surface)",
    "var(--surface-raised)",
  );

  const menuItemHoverHandlers = getHoverHandlers(
    "var(--text-muted)",
    "var(--text)",
    "transparent",
    "var(--surface-raised)",
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end"
      style={{
        paddingTop: "max(14px, calc(env(safe-area-inset-top) + 10px))",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
        paddingRight: "max(16px, env(safe-area-inset-right))",
      }}
    >
      <div
        className="pointer-events-auto flex flex-wrap items-start justify-end gap-2"
        style={{
          maxWidth: "min(100%, 460px)",
        }}
      >
      {showGuestLinks
        ? guestLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-xs font-medium"
              style={{
                ...btnStyle,
                color: "var(--text)",
                minWidth: 0,
                paddingInline: 14,
              }}
              {...pillHoverHandlers}
            >
              {link.label}
            </Link>
          ))
        : null}

      {auth ? (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-full px-3 py-2 text-xs font-medium"
            style={{
              ...btnStyle,
              color: "var(--text)",
              minWidth: 0,
              gap: 8,
              maxWidth: 190,
              paddingInline: 14,
            }}
            {...pillHoverHandlers}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              @{auth.username}
            </span>
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.18s ease",
              }}
            >
              <ChevronDownIcon />
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-lg"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                boxShadow: "0 20px 45px rgba(0, 0, 0, 0.16)",
              }}
            >
              <div
                className="border-b px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.16em]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-faint)",
                }}
              >
                Signed in as @{auth.username}
              </div>

              <div className="pt-2">
                {accountLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className="flex rounded-xl px-3 py-2 text-sm transition-colors duration-150"
                    style={{
                      color: link.isActive ? "var(--text)" : "var(--text-muted)",
                      background: link.isActive ? "var(--surface-raised)" : "transparent",
                    }}
                    {...(!link.isActive ? menuItemHoverHandlers : {})}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div
                className="mt-2 border-t pt-2"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    color: "var(--text-muted)",
                    background: "transparent",
                  }}
                  {...menuItemHoverHandlers}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
        className="rounded-full"
        style={{
          ...btnStyle,
          width: 38,
          height: 38,
          borderRadius: 999,
          cursor: "pointer",
        }}
        {...pillHoverHandlers}
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
      </div>
    </div>
  );
}
