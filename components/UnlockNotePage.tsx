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

export default function UnlockNotePage({ slug }: { slug: string }) {
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch(`/api/n/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;

      if (!response.ok || !data?.redirectTo) {
        setStatus("error");
        setErrorMsg(data?.error ?? "Could not unlock this note. Try again.");
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
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm animate-morph-in">
        <section
          className="rounded-[24px] border px-5 py-6 sm:px-6"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col items-start gap-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <LockIcon />
              </div>

              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Password Required
                </p>
                <h1
                  className="mt-1 text-xl font-semibold tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  /n/{slug}
                </h1>
              </div>
            </div>

            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              Enter the note password to continue.
            </p>

            <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
              <div key={errorKey} className={isError ? "animate-shake" : ""}>
                <label htmlFor="note-password" className="sr-only">
                  Note password
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
                    id="note-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (isError) {
                        setStatus("idle");
                        setErrorMsg("");
                      }
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={isLoading || isSuccess}
                    className="flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-[var(--text-faint)]"
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
                  Unlock Note
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
