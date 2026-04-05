"use client";

import { useState, useEffect, useCallback } from "react";

interface LinkEntry {
  shortId: string;
  originalUrl: string;
  createdAt: string;
  clicks: number;
  hasPassword?: boolean;
}

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

const ClipboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
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
    width="12"
    height="12"
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

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="11"
    height="11"
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

function LinkRow({ link, index }: { link: LinkEntry; index: number }) {
  const [copied, setCopied] = useState(false);
  const shortUrl = `${window.location.origin}/${link.shortId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shortUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const delayClass =
    index === 0
      ? ""
      : index === 1
        ? "delay-50"
        : index === 2
          ? "delay-100"
          : index === 3
            ? "delay-150"
            : index === 4
              ? "delay-200"
              : "delay-250";

  return (
    <div
      className={`animate-morph-slide ${delayClass} flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0 group`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--accent)] hover:underline underline-offset-2 truncate"
          >
            /{link.shortId}
          </a>
          <span
            className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {link.clicks} {link.clicks === 1 ? "click" : "clicks"}
          </span>
          {link.hasPassword && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] flex-shrink-0"
              style={{
                background: "var(--surface-raised)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              <LockIcon />
              Locked
            </span>
          )}
        </div>
        <p
          className="text-[11px] truncate mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {link.originalUrl}
        </p>
        <p
          className="text-[10px] mt-0.5 tabular-nums"
          style={{ color: "var(--text-faint)" }}
        >
          {formatRelative(link.createdAt)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy short URL"}
        className="relative overflow-hidden flex-shrink-0 flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
        style={{
          borderColor: copied ? "var(--accent-soft-border)" : "var(--border)",
          background: copied ? "var(--accent-soft)" : "var(--surface)",
          color: "var(--accent)",
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center gap-1 transition-all duration-200"
          style={{
            opacity: copied ? 0 : 1,
            transform: copied ? "scale(0.75)" : "scale(1)",
          }}
        >
          <ClipboardIcon />
          <span>Copy</span>
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center gap-1 transition-all duration-200"
          style={{
            opacity: copied ? 1 : 0,
            transform: copied ? "scale(1)" : "scale(1.2)",
          }}
        >
          <CheckIcon />
          <span>Done!</span>
        </span>
        <span className="invisible flex items-center gap-1" aria-hidden="true">
          <span className="w-3 h-3" />
          <span>Done!</span>
        </span>
      </button>
    </div>
  );
}

export default function LinksList({ refreshKey }: { refreshKey: number }) {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/short-links", {
        cache: "no-store",
      });
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks, refreshKey]);

  if (loading) {
    return (
      <div className="mt-6 animate-fade-in">
        <div className="h-px mb-5" style={{ background: "var(--border)" }} />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 py-2.5 border-b border-[var(--border)] last:border-0">
              <div
                className="h-3.5 w-24 rounded-full animate-pulse"
                style={{ background: "var(--surface-raised)" }}
              />
              <div
                className="h-2.5 w-48 rounded-full animate-pulse"
                style={{ background: "var(--surface-raised)" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (links.length === 0) return null;

  return (
    <div className="mt-6 animate-morph-in">
      <div className="h-px mb-1" style={{ background: "var(--border)" }} />
      <div
        className="flex items-center justify-between mb-1 pt-4"
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-faint)" }}
        >
          Recent
        </span>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: "var(--text-faint)" }}
        >
          {links.length} {links.length === 1 ? "link" : "links"}
        </span>
      </div>
      <div>
        {links.map((link, i) => (
          <LinkRow key={link.shortId} link={link} index={i} />
        ))}
      </div>
    </div>
  );
}
