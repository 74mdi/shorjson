"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type UnlockStatus = "idle" | "loading" | "success" | "error";

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="11" x="5" y="11" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function UnlockLinkPage({
  slug,
}: {
  slug: string;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/links/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;

      if (!res.ok || !data?.redirectTo) {
        setStatus("error");
        setErrorMsg(data?.error ?? "Could not unlock this link. Try again.");
        setErrorKey((value) => value + 1);
        return;
      }

      setStatus("success");
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.assign(data.redirectTo as string);
      }, 240);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
      setErrorKey((value) => value + 1);
    }
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-[80%]">
        <div
          className="h-56 w-56 rounded-full blur-3xl animate-orb-drift"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-[10%]">
        <div
          className="h-64 w-64 rounded-full blur-3xl animate-orb-drift-reverse"
          style={{
            background: "color-mix(in srgb, var(--accent) 7%, transparent)",
          }}
        />
      </div>

      <div className="relative w-full max-w-md animate-morph-in">
        <div
          className="absolute inset-x-8 top-5 h-28 rounded-full blur-3xl animate-soft-pulse"
          style={{ background: "color-mix(in srgb, var(--accent) 9%, transparent)" }}
          aria-hidden="true"
        />

        <section
          className="relative overflow-hidden rounded-[28px] border px-6 py-7 shadow-[0_24px_80px_-48px_var(--accent-glow)] sm:px-7"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, var(--bg)) 0%, var(--bg) 100%)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="absolute inset-x-6 top-0 h-px opacity-80"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 32%, transparent), transparent)",
            }}
          />

          <div className="flex flex-col items-start gap-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border animate-soft-pulse"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--surface-raised) 82%, var(--bg)), color-mix(in srgb, var(--accent) 5%, var(--surface)))",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <LockIcon />
              </div>

              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Protected Link
                </p>
                <h1
                  className="mt-1 text-2xl font-semibold tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  /{slug}
                </h1>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Enter the password to continue to this protected link.
              </p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                This browser stays unlocked for 12 hours after a successful entry.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
              <div key={errorKey} className={isError ? "animate-shake" : ""}>
                <label htmlFor="link-password" className="sr-only">
                  Link password
                </label>
                <div
                  className="flex items-center overflow-hidden rounded-2xl border transition-all duration-200"
                  style={{
                    background: "var(--surface)",
                    borderColor: isError ? "rgb(252 165 165)" : "var(--border)",
                    boxShadow: isError
                      ? "0 0 0 3px rgba(239, 68, 68, 0.08)"
                      : "none",
                  }}
                >
                  <input
                    id="link-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (isError) {
                        setStatus("idle");
                        setErrorMsg("");
                      }
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={isLoading || isSuccess}
                    className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-[var(--text-faint)]"
                    style={{ color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isLoading || isSuccess}
                    className="px-4 text-xs font-medium transition-colors duration-200 hover:text-[var(--accent)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isSuccess || !password.trim()}
                className={[
                  "relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200",
                  "shadow-[0_12px_30px_-18px_var(--accent-glow)]",
                  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
                ].join(" ")}
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                }}
              >
                <span className="invisible flex items-center gap-2" aria-hidden="true">
                  <Spinner />
                  Checking...
                </span>

                <span
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-in-out"
                  style={{
                    transform:
                      isLoading || isSuccess ? "translateY(-100%)" : "translateY(0)",
                  }}
                >
                  Unlock Link
                </span>

                <span
                  className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ease-in-out"
                  style={{
                    transform:
                      isLoading || isSuccess ? "translateY(0)" : "translateY(100%)",
                  }}
                >
                  {isSuccess ? <LockIcon /> : <Spinner />}
                  {isSuccess ? "Unlocked" : "Checking..."}
                </span>
              </button>

              {isError && errorMsg ? (
                <p
                  role="alert"
                  className="text-xs font-medium animate-fade-in"
                  style={{ color: "rgb(239 68 68)" }}
                >
                  {errorMsg}
                </p>
              ) : null}
            </form>

            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <Link
                href="/"
                className="transition-colors duration-200 hover:text-[var(--accent)]"
              >
                ← Back home
              </Link>
              <span aria-hidden="true">•</span>
              <span>Password required by the link owner</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
