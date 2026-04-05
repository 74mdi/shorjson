"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInSchema, signUpSchema } from "@/lib/schemas";

type Mode = "sign-in" | "sign-up";

type FieldErrors = Partial<Record<"password" | "username", string[]>>;

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});

    const schema = isSignUp ? signUpSchema : signInSchema;
    const parsed = schema.safeParse({ username, password });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        setFieldErrors(data.fieldErrors ?? {});
        setSubmitting(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="animate-page-fade flex min-h-dvh items-center justify-center px-5 pb-16">
      <div className="w-full max-w-sm">
        <header className="animate-morph-in pb-6">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            {isSignUp ? "Create account" : "Sign in"}
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {isSignUp
              ? "Claim a username and keep your links and notes private."
              : "Access your private links, notes, and exports."}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="animate-morph-in delay-100 flex flex-col gap-3"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--text-faint)" }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete={isSignUp ? "username" : "username"}
              spellCheck={false}
              disabled={submitting}
              placeholder="lowercase_username"
              className="w-full rounded-xl border bg-[var(--surface)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
              style={{ borderColor: "var(--border)" }}
            />
            <p className="min-h-[16px] text-[11px]" style={{ color: "#dc2626" }}>
              {fieldErrors.username?.[0] ?? (isSignUp ? "3-20 chars. Lowercase letters, numbers, underscores." : "")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--text-faint)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={submitting}
              placeholder={isSignUp ? "At least 8 characters" : "Your password"}
              className="w-full rounded-xl border bg-[var(--surface)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
              style={{ borderColor: "var(--border)" }}
            />
            <p className="min-h-[16px] text-[11px]" style={{ color: "#dc2626" }}>
              {fieldErrors.password?.[0] ?? ""}
            </p>
          </div>

          {error ? (
            <p className="text-sm" style={{ color: "#dc2626" }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
            }}
          >
            {submitting ? <Spinner /> : null}
            <span>{isSignUp ? "Create account" : "Sign in"}</span>
          </button>
        </form>

        <p
          className="animate-morph-in delay-150 pt-5 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {isSignUp ? "Already have an account? " : "Need an account? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-medium text-[var(--text)] underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </main>
  );
}
