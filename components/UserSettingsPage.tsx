"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DbPanel = dynamic(() => import("./DbPanel"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl border px-4 py-5 text-sm"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        color: "var(--text-muted)",
      }}
    >
      Loading settings…
    </div>
  ),
});

export default function UserSettingsPage({
  csrfToken,
  username,
}: {
  csrfToken: string;
  username: string;
}) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("shor-mode", next ? "dark" : "light");
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-dvh px-5 pb-28 pt-12 sm:pt-16">
      <div className="mx-auto w-full max-w-2xl animate-morph-in">
        <header className="pb-6">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            <span>@{username}</span>
          </div>
          <h1
            className="pt-4 text-3xl font-semibold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            User
          </h1>
          <p className="pt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            Shortcuts, page controls, and app settings live here now.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
          <section
            className="rounded-3xl border p-5"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-faint)" }}>
                  Public Page
                </p>
                <h2 className="pt-2 text-xl font-semibold" style={{ color: "var(--text)" }}>
                  Bio links
                </h2>
              </div>
              <div
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                /{username}
              </div>
            </div>

            <div className="grid gap-3 pt-5 sm:grid-cols-2">
              <Link
                href="/dashboard/links"
                className="rounded-2xl border px-4 py-4 transition-all duration-200"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">Edit bio page</div>
                <div className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                  Update links, themes, fonts, colors, and motion.
                </div>
              </Link>

              <Link
                href={`/${username}`}
                className="rounded-2xl border px-4 py-4 transition-all duration-200"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">Open public page</div>
                <div className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                  Check the live bio page visitors will see.
                </div>
              </Link>
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-faint)" }}>
              Account
            </p>
            <div className="grid gap-3 pt-5">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-2xl border px-4 py-3 text-left transition-all duration-200"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">
                  {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
                </div>
                <div className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                  Toggle the app theme.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-2xl border px-4 py-3 text-left transition-all duration-200"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">Settings</div>
                <div className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                  Database, import/export, and remote sync.
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="rounded-2xl border px-4 py-3 text-left transition-all duration-200 disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">
                  {signingOut ? "Signing out…" : "Sign out"}
                </div>
                <div className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                  End this session on this device.
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>

      {settingsOpen ? (
        <DbPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </main>
  );
}
