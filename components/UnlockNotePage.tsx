"use client";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnlockNotePage({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Enter the password to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/n/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.redirectTo) {
          router.push(data.redirectTo);
          router.refresh(); // Force a refresh to load the content properly via SSR
        } else {
          router.refresh();
        }
      } else {
        setError(data.error || "Failed to unlock note.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh px-5 pb-16 pt-24">
      <div
        className="mx-auto max-w-sm rounded-3xl border p-6 text-center"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--border)" }}
        >
          <svg className="h-6 w-6" style={{ color: "var(--text)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Protected Note
        </div>
        <p className="pt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
          Enter the password to view this note.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder="Password"
            className="flex-1 rounded-xl border px-4 py-3 text-[15px] outline-none transition-all placeholder:text-gray-400 focus:ring-2 disabled:opacity-50"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="flex items-center justify-center rounded-xl px-5 font-semibold transition-all disabled:opacity-50"
            style={{
              background: "var(--text)",
              color: "var(--bg)",
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </form>
        {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
      </div>
    </main>
  );
}
