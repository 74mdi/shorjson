"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getPublicBioPath } from "@/lib/bio-shared";
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);

  const isSignUp = mode === "sign-up";
  const normalizedUsername = username.trim().toLowerCase();
  const publicPreviewPath = getPublicBioPath(normalizedUsername || "username");
  const usernameHelper = fieldErrors.username?.[0]
    ?? (isSignUp
      ? checkingUsername
        ? "Checking availability..."
        : normalizedUsername && !usernameAvailable
          ? "That username is already taken."
          : "3-20 chars. Lowercase letters, numbers, underscores."
      : "Use the same username you created your account with.");
  const featureRows = isSignUp
    ? [
        "Own one username across short links, notes, and your public /@ page.",
        "Everything private stays private until you publish it.",
        "You can fine-tune profile and style settings after sign up.",
      ]
    : [
        "Jump back into your links, notes, and public page editor.",
        "Your account keeps the workspace tied to one username.",
        "The username in the top bar still takes you straight to profile.",
      ];

  useEffect(() => {
    if (!isSignUp) return;

    if (!normalizedUsername) {
      setCheckingUsername(false);
      setUsernameAvailable(true);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(
          `/api/check-username?u=${encodeURIComponent(normalizedUsername)}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => ({}))) as {
          available?: boolean;
        };
        setUsernameAvailable(Boolean(data.available));
      } catch {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [isSignUp, normalizedUsername]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (isSignUp && !checkingUsername && !usernameAvailable) {
      setFieldErrors({
        username: ["That username is already taken."],
      });
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
    <main className="animate-page-fade min-h-dvh px-5 py-8 sm:py-12">
      <div
        className="mx-auto w-full max-w-5xl rounded-[32px] border p-3 sm:p-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_420px]">
          <section
            className="animate-morph-in rounded-[26px] border p-6 sm:p-8"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
              <span
                className="rounded-full border px-3 py-1"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Shor
              </span>
              <span style={{ color: "var(--text-faint)" }}>
                {isSignUp ? "Create account" : "Account access"}
              </span>
            </div>

            <h1
              className="max-w-2xl pt-6 text-4xl font-semibold tracking-tight sm:text-[3.6rem]"
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-grotesk-ui)",
              }}
            >
              {isSignUp ? "One username. One clean workspace." : "Welcome back."}
            </h1>

            <p
              className="max-w-xl pt-4 text-sm leading-7 sm:text-base"
              style={{ color: "var(--text-muted)" }}
            >
              {isSignUp
                ? "Create a quiet account for short links, notes, and your public /@username page."
                : "Sign in to manage your links, notes, and public page without the clutter."}
            </p>

            <div
              className="mt-8 rounded-[24px] border p-5"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div
                    className="text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Public URL
                  </div>
                  <div
                    className="pt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                    style={{ color: "var(--text)" }}
                  >
                    {publicPreviewPath}
                  </div>
                </div>

                <div
                  className="min-w-[160px] rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <div
                    className="text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Username
                  </div>
                  <div
                    className="pt-2 text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    @{normalizedUsername || "username"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {featureRows.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border px-4 py-3.5 text-sm leading-7"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section
            className="animate-morph-in rounded-[26px] border p-6 sm:p-7"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
          <header>
            <p
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: "var(--text-faint)" }}
            >
              {isSignUp ? "New account" : "Account access"}
            </p>
            <h2
              className="pt-3 text-3xl font-semibold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {isSignUp ? "Create account" : "Sign in"}
            </h2>
            <p className="pt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
              {isSignUp
                ? "Start with a username and password. You can edit your full profile later."
                : "Use your username and password to unlock your workspace."}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-6" noValidate>
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Username
                </span>
                {isSignUp ? (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {checkingUsername
                      ? "Checking..."
                      : normalizedUsername && !usernameAvailable
                        ? "Taken"
                        : "Available"}
                  </span>
                ) : null}
              </div>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                spellCheck={false}
                disabled={submitting}
                autoFocus
                placeholder="lowercase_username"
                className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                style={{ borderColor: "var(--border)" }}
              />

              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span style={{ color: fieldErrors.username?.[0] ? "#c0392b" : "var(--text-muted)" }}>
                  {usernameHelper}
                </span>
                {isSignUp ? (
                  <span style={{ color: "var(--text-faint)" }}>{publicPreviewPath}</span>
                ) : null}
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Password
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                disabled={submitting}
                placeholder={isSignUp ? "At least 8 characters" : "Your password"}
                className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                style={{ borderColor: "var(--border)" }}
              />

              <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                {fieldErrors.password?.[0] ?? ""}
              </span>
            </label>

            {error ? (
              <p className="text-sm" style={{ color: "#c0392b" }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
              }}
            >
              {submitting ? <Spinner /> : null}
              <span>{isSignUp ? "Create account" : "Sign in"}</span>
            </button>
          </form>

          <div
            className="mt-5 rounded-[22px] border p-4 text-sm leading-7"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              color: "var(--text-muted)",
            }}
            >
              {isSignUp
                ? "You can change your name, username, avatar, and password later from your profile page."
                : "After signing in, your top bar username takes you straight to your profile page."}
          </div>

          <p className="pt-5 text-sm" style={{ color: "var(--text-muted)" }}>
            {isSignUp ? "Already have an account? " : "Need an account? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-medium text-[var(--text)] underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </Link>
          </p>
          </section>
        </div>
      </div>
    </main>
  );
}
