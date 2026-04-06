"use client";

"use client";

import { useState } from "react";
import { stripNoteHtml } from "@/lib/note-html";

export default function NoteClientActions({
  title,
  htmlContent,
}: {
  title: string;
  htmlContent: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // We can copy plain text and html formats to the clipboard
    const plainText = stripNoteHtml(htmlContent);
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });
    const textBlob = new Blob([plainText], { type: "text/plain" });

    try {
      navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || "Note"}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 1em; color: #555; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "Note"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex min-w-[90px] items-center justify-center gap-2 block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-[#1c1916] transition-all hover:bg-gray-50 active:scale-[0.98]"
        title="Copy Note"
      >
        {copied ? <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>}
        {copied ? "Copied" : "Copy"}
      </button>

      <button
        onClick={handleDownloadHtml}
        className="flex items-center gap-2 block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-[#1c1916] transition-all hover:bg-gray-50 active:scale-[0.98]"
        title="Download HTML"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download HTML
      </button>
    </div>
  );
}
