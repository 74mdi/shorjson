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
    <main className="animate-page-fade min-h-dvh px-5 py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section
          className="animate-morph-in rounded-[32px] border p-6 sm:p-8"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--surface) 82%, transparent), color-mix(in srgb, var(--accent) 7%, var(--bg)))",
          }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            <span>Shor</span>
            <span>{isSignUp ? "Create your space" : "Welcome back"}</span>
          </div>

          <h1
            className="pt-6 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: "var(--text)" }}
          >
            {isSignUp
              ? "Short links, notes, and your public bio in one account."
              : "Pick up right where you left off."}
          </h1>

          <p
            className="max-w-2xl pt-4 text-sm leading-7 sm:text-base"
            style={{ color: "var(--text-muted)" }}
          >
            {isSignUp
              ? "Claim a username, publish an /@username page, and keep the rest of your workspace private."
              : "Sign in to manage your links, edit your public page, and keep writing in your private notes."}
          </p>

          <div className="grid gap-3 pt-8 sm:grid-cols-3">
            {[
              {
                title: "Shortener",
                text: "Create private short links with custom slugs and protection.",
              },
              {
                title: "Bio page",
                text: "Share a clean public page that lives at /@username.",
              },
              {
                title: "Notes",
                text: "Keep a focused writing space tied only to your own account.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`rounded-3xl border p-4 ${index === 1 ? "sm:-translate-y-2" : ""}`}
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--surface) 84%, transparent)",
                }}
              >
                <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {item.title}
                </div>
                <p
                  className="pt-2 text-sm leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-[28px] border p-5"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--bg) 78%, transparent)",
            }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: "var(--text-faint)" }}
            >
              Public bio preview
            </p>
            <div className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div
                  className="text-xl font-semibold sm:text-2xl"
                  style={{ color: "var(--text)" }}
                >
                  {publicPreviewPath}
                </div>
                <p
                  className="pt-2 text-sm leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your username becomes the public URL for your bio links page.
                </p>
              </div>

              <div
                className="rounded-2xl border px-4 py-3 text-right"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">
                  Username
                </div>
                <div className="pt-1 text-sm font-medium">
                  @{normalizedUsername || "username"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="animate-morph-in rounded-[32px] border p-6 sm:p-7"
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
            className="mt-5 rounded-3xl border p-4 text-sm"
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
    </main>
  );
}
