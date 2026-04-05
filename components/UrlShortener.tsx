"use client";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(d > 365 ? { year: "numeric" } : {}),
  });
}

// components/UrlShortener.tsx
// Full-featured URL shortener.
// - All colours use CSS custom properties — no hardcoded hex, no dark: prefixes.
// - Custom slug toggle: CSS grid 0fr → 1fr reveal.
// - Submit button: two absolutely-positioned spans that slide up / down (morph).
// - Copy button: invisible sizer + two absolute spans that scale / fade (morph).
// - Error state: animate-shake re-triggered via key={errorKey}.
// - Success: useEffect scrolls result into view.

import { useState, useRef, useEffect } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Status = "idle" | "loading" | "success" | "error";

interface ShortenResult {
  shortId: string;
  shortUrl: string;
  createdAt?: string;
  clicks?: number;
  hasPassword?: boolean;
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const ClipboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
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
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
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
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
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
    <rect width="14" height="10" x="5" y="11" rx="2" />
    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
  </svg>
);

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function UrlShortener({ onShorten }: { onShorten?: () => void }) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [showSlug, setShowSlug] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smooth-scroll the result into view on mobile when it appears
  useEffect(() => {
    if (status === "success" && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [status]);

  // Clear copy-reset timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  /* ── Shorten handler ── */
  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setCopied(false);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          slug: slug.trim() || undefined,
          password: showPasswordField ? password : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        setErrorKey((k) => k + 1);
        return;
      }

      setResult(data as ShortenResult);
      setStatus("success");
      onShorten?.();
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setStatus("error");
      setErrorKey((k) => k + 1);
    }
  }

  /* ── Copy handler ── */
  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
    } catch {
      // Fallback for browsers that block the Clipboard API
      const el = document.createElement("textarea");
      el.value = result.shortUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  const isLoading = status === "loading";
  const isError = status === "error";
  const showResult = status === "success" && result !== null;

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* ── Form ── */}
      <form
        onSubmit={handleShorten}
        noValidate
        className="flex flex-col gap-2.5"
      >
        {/* Visually hidden label */}
        <label htmlFor="url-input" className="sr-only">
          Long URL to shorten
        </label>

        {/* ── URL input — shake wrapper re-mounts on each error to re-trigger animation ── */}
        <div key={errorKey} className={isError ? "animate-shake" : ""}>
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setErrorMsg("");
              }
            }}
            placeholder="https://your-very-long-url.com/..."
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
            className={[
              "w-full rounded-xl px-4 py-3.5 text-sm outline-none",
              "bg-[var(--surface)] text-[var(--text)]",
              "placeholder:text-[var(--text-muted)]",
              "border transition-all duration-200",
              isError
                ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                : "border-[var(--border)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]",
              isLoading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          />
        </div>

        {/* ── Optional controls toggles ── */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSlug((v) => !v)}
              className="text-xs transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {showSlug ? "− slug" : "+ custom slug"}
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordField((value) => !value)}
              className="text-xs transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {showPasswordField ? "− password" : "+ password"}
            </button>
          </div>

          {/* CSS grid 0fr → 1fr reveal */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: showSlug ? "1fr" : "0fr",
              transition:
                "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div className="pt-2">
                {/* Slug input with focus-within ring on the container */}
                <div
                  className={[
                    "flex items-center rounded-xl border transition-all duration-200 overflow-hidden",
                    "bg-[var(--surface)] border-[var(--border)]",
                    "focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]",
                  ].join(" ")}
                >
                  <span className="pl-3.5 text-sm text-[var(--text-muted)] select-none flex-shrink-0">
                    /
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="my-custom-slug"
                    disabled={isLoading}
                    autoComplete="off"
                    spellCheck={false}
                    className={[
                      "flex-1 bg-transparent px-2 py-3 text-sm outline-none",
                      "text-[var(--text)] placeholder:text-[var(--text-faint)]",
                      isLoading ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateRows: showPasswordField ? "1fr" : "0fr",
              transition:
                "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div className="pt-2">
                <div
                  className={[
                    "flex items-center rounded-xl border transition-all duration-200 overflow-hidden",
                    "bg-[var(--surface)] border-[var(--border)]",
                    "focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]",
                  ].join(" ")}
                >
                  <span className="pl-3.5 text-[var(--text-muted)] select-none flex-shrink-0">
                    <LockIcon />
                  </span>
                  <input
                    type={revealPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a link password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    spellCheck={false}
                    className={[
                      "flex-1 bg-transparent px-2 py-3 text-sm outline-none",
                      "text-[var(--text)] placeholder:text-[var(--text-faint)]",
                      isLoading ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealPassword((value) => !value)}
                    disabled={isLoading}
                    className={[
                      "px-3 text-xs font-medium transition-colors duration-200",
                      "text-[var(--text-muted)] hover:text-[var(--accent)]",
                      isLoading ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {revealPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Shorten button — morph animation ── */}
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={[
            // Morph: overflow hidden so sliding spans are clipped
            "relative overflow-hidden",
            "flex w-full items-center justify-center",
            "rounded-xl py-3.5 text-sm font-semibold text-[var(--bg)]",
            "bg-[var(--accent)]",
            "shadow-[0_2px_16px_var(--accent-glow)]",
            "hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_24px_var(--accent-glow)]",
            "active:scale-[0.98]",
            "transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "disabled:shadow-none disabled:scale-100",
          ].join(" ")}
        >
          {/* Invisible sizer — fixes the button width to the wider label */}
          <span
            className="invisible flex items-center gap-2"
            aria-hidden="true"
          >
            <span className="h-4 w-4 flex-shrink-0" />
            Shortening…
          </span>

          {/* Outgoing span — "Shorten →", slides up when loading */}
          <span
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-in-out"
            style={{
              transform: isLoading ? "translateY(-100%)" : "translateY(0)",
            }}
            aria-hidden={isLoading}
          >
            Shorten →
          </span>

          {/* Incoming span — spinner + "Shortening…", slides in from below */}
          <span
            className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ease-in-out"
            style={{
              transform: isLoading ? "translateY(0)" : "translateY(100%)",
            }}
            aria-hidden={!isLoading}
          >
            <Spinner />
            Shortening…
          </span>
        </button>

        {/* ── Inline error message ── */}
        {isError && errorMsg && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium animate-fade-in text-red-500"
          >
            <span aria-hidden="true">⚠</span>
            {errorMsg}
          </p>
        )}
      </form>

      {/* ── Result — CSS grid 0fr → 1fr reveal ── */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: showResult ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div ref={resultRef} className="mt-6">
            {/* Hairline divider */}
            <div className="mb-5 h-px bg-[var(--border)]" />

            {result && (
              <div className="animate-slide-down">
                {/* Short link row */}
                <div className="flex items-center gap-3">
                  {/* Clickable short URL */}
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <a
                      href={result.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {result.shortUrl}
                    </a>
                    {result.hasPassword && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] flex-shrink-0"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface-raised)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <LockIcon />
                        Locked
                      </span>
                    )}
                  </div>

                  {/* ── Copy button — morph animation ── */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    title={copied ? "Copied!" : "Copy to clipboard"}
                    className={[
                      // Morph: overflow hidden so scaling spans are clipped
                      "relative overflow-hidden",
                      "flex flex-shrink-0 items-center",
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      "transition-all duration-150",
                      copied
                        ? // Confirmed — universally green (works across all themes)
                          "border-green-200 bg-green-50 text-green-600"
                        : [
                            "border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]",
                            "hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft)]",
                          ].join(" "),
                    ].join(" ")}
                  >
                    {/* Invisible sizer — fixes width to wider "Copied!" state */}
                    <span
                      className="invisible flex items-center gap-1.5"
                      aria-hidden="true"
                    >
                      <span className="w-[13px] h-[13px] flex-shrink-0" />
                      <span>Copied!</span>
                    </span>

                    {/* Default state — scales down + fades out when copied */}
                    <span
                      className="absolute inset-0 flex items-center justify-center gap-1.5 transition-all duration-200"
                      style={{
                        opacity: copied ? 0 : 1,
                        transform: copied ? "scale(0.75)" : "scale(1)",
                      }}
                      aria-hidden={copied}
                    >
                      <ClipboardIcon />
                      <span>Copy</span>
                    </span>

                    {/* Copied state — scales in + fades when active */}
                    <span
                      className="absolute inset-0 flex items-center justify-center gap-1.5 transition-all duration-200"
                      style={{
                        opacity: copied ? 1 : 0,
                        transform: copied ? "scale(1)" : "scale(1.2)",
                      }}
                      aria-hidden={!copied}
                    >
                      <CheckIcon />
                      <span>Copied!</span>
                    </span>
                  </button>
                </div>

                {/* Metadata — creation date + click count */}
                {(result.createdAt !== undefined ||
                  result.clicks !== undefined ||
                  result.hasPassword) && (
                  <p
                    className="mt-2 text-[11px] select-none tabular-nums"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {result.hasPassword && <span>password protected</span>}
                    {result.hasPassword &&
                      (result.createdAt !== undefined ||
                        result.clicks !== undefined) && <span> · </span>}
                    {result.createdAt && (
                      <span>{formatRelative(result.createdAt)}</span>
                    )}
                    {result.createdAt !== undefined &&
                      result.clicks !== undefined && <span> · </span>}
                    {result.clicks !== undefined && (
                      <span>
                        {result.clicks}{" "}
                        {result.clicks === 1 ? "click" : "clicks"}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
