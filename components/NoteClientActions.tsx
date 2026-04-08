"use client";

import { useState } from "react";
import { stripNoteHtml } from "@/lib/note-html";

function CopyIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDownloadFilename(title: string): string {
  const safeBase = title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);

  return `${safeBase || "Note"}.html`;
}

async function copyPlainTextFallback(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

export default function NoteClientActions({
  title,
  htmlContent,
}: {
  title: string;
  htmlContent: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const plainText = stripNoteHtml(htmlContent);
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });
    const textBlob = new Blob([plainText], { type: "text/plain" });

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        const copiedWithFallback = await copyPlainTextFallback(plainText);
        if (!copiedWithFallback) {
          setCopied(false);
          return;
        }
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        const copiedWithFallback = await copyPlainTextFallback(plainText);
        if (!copiedWithFallback) {
          setCopied(false);
          return;
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        setCopied(false);
      }
    }
  }

  function handleDownloadHtml() {
    const safeTitle = escapeHtml(title || "Note");
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 1em; color: #555; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getDownloadFilename(title || "Note");
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="note-share-actions flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200"
        style={{
          borderColor: copied ? "var(--accent-soft-border)" : "var(--border)",
          background: copied ? "var(--surface-raised)" : "transparent",
          color: copied ? "var(--accent)" : "var(--text)",
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </button>

      <button
        type="button"
        onClick={handleDownloadHtml}
        className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200"
        style={{
          borderColor: "var(--border)",
          background: "transparent",
          color: "var(--text)",
        }}
      >
        <DownloadIcon />
        Download
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200"
        style={{
          borderColor: "var(--border)",
          background: "transparent",
          color: "var(--text)",
        }}
      >
        <PrintIcon />
        Print
      </button>
    </div>
  );
}
