"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { BioProfile } from "@/lib/account-types";
import { getPublicBioPath } from "@/lib/bio-shared";
import {
  bioProfileSchema,
  passwordChangeSchema,
  USERNAME_PATTERN,
} from "@/lib/schemas";
import { applyTheme, getCurrentThemeIsDark, subscribeToTheme } from "@/lib/theme-client";

const DbPanel = dynamic(() => import("./DbPanel"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl border px-4 py-5 text-sm"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        color: "var(--text-muted)",
      }}
    >
      Loading settings...
    </div>
  ),
});

type ProfileFieldErrors = Partial<
  Record<"avatar" | "bio" | "displayName" | "username", string[]>
>;

type PasswordFieldErrors = Partial<
  Record<"confirmPassword" | "currentPassword" | "newPassword", string[]>
>;

type SaveState = "error" | "idle" | "saved" | "saving";

function formatAccountDate(value: string): string {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getAvatarInitial(profile: BioProfile): string {
  return (
    profile.displayName.slice(0, 1).toUpperCase() ||
    profile.username.slice(0, 1).toUpperCase() ||
    "@"
  );
}

export default function UserSettingsPage({
  csrfToken,
  initialProfile,
  username,
}: {
  csrfToken: string;
  initialProfile: BioProfile;
  username: string;
}) {
  const router = useRouter();
  const profileResetTimerRef = useRef<number | null>(null);
  const lastSavedUsernameRef = useRef(initialProfile.username);

  const [profile, setProfile] = useState(initialProfile);
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [profileSaveState, setProfileSaveState] = useState<SaveState>("idle");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordFieldErrors>({});
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSiteOrigin(window.location.origin);
    setIsDark(getCurrentThemeIsDark());
    const unsubscribe = subscribeToTheme((nextIsDark) => {
      setIsDark(nextIsDark);
    });

    return () => {
      unsubscribe();
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (profile.username === lastSavedUsernameRef.current) {
      setCheckingUsername(false);
      setUsernameAvailable(true);
      return;
    }

    if (!USERNAME_PATTERN.test(profile.username)) {
      setCheckingUsername(false);
      setUsernameAvailable(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(
          `/api/check-username?u=${encodeURIComponent(profile.username)}`,
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
  }, [profile.username]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  function markProfileSaved() {
    setProfileSaveState("saved");
    if (profileResetTimerRef.current) {
      window.clearTimeout(profileResetTimerRef.current);
    }

    profileResetTimerRef.current = window.setTimeout(() => {
      setProfileSaveState("idle");
    }, 1600);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileErrors({});
    setProfileSaveState("saving");

    const parsed = bioProfileSchema.safeParse(profile);
    if (!parsed.success) {
      setProfileErrors(parsed.error.flatten().fieldErrors);
      setProfileSaveState("error");
      return;
    }

    if (
      !checkingUsername &&
      !usernameAvailable &&
      parsed.data.username !== lastSavedUsernameRef.current
    ) {
      setProfileErrors({
        username: ["That username is already taken."],
      });
      setProfileSaveState("error");
      return;
    }

    try {
      const response = await fetch("/api/bio/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json().catch(() => ({}))) as
        | BioProfile
        | { error?: string; fieldErrors?: ProfileFieldErrors };

      if (!response.ok) {
        setProfileErrors(
          "fieldErrors" in data && data.fieldErrors ? data.fieldErrors : {},
        );
        setProfileSaveState("error");
        return;
      }

      const updatedProfile = data as BioProfile;
      setProfile(updatedProfile);
      setProfileErrors({});
      lastSavedUsernameRef.current = updatedProfile.username;
      setUsernameAvailable(true);
      markProfileSaved();
      router.refresh();
    } catch {
      setProfileSaveState("error");
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;

      setProfile((current) => ({
        ...current,
        avatar: result,
      }));
      setProfileErrors((current) => ({
        ...current,
        avatar: undefined,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSubmitting(true);
    setPasswordErrors({});
    setPasswordMessage("");

    const parsed = passwordChangeSchema.safeParse(passwordForm);
    if (!parsed.success) {
      setPasswordErrors(parsed.error.flatten().fieldErrors);
      setPasswordSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: PasswordFieldErrors;
      };

      if (!response.ok) {
        setPasswordErrors(data.fieldErrors ?? {});
        setPasswordMessage(data.error ?? "Unable to update password.");
        setPasswordSubmitting(false);
        return;
      }

      setPasswordForm({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
      setPasswordMessage("Password updated.");
      setPasswordSubmitting(false);
    } catch {
      setPasswordMessage("Unable to update password.");
      setPasswordSubmitting(false);
    }
  }

  const activeUsername = profile.username || username;
  const publicPath = getPublicBioPath(activeUsername);
  const publicUrl = siteOrigin ? `${siteOrigin}${publicPath}` : publicPath;
  const profileSaveLabel =
    profileSaveState === "saving"
      ? "Saving..."
      : profileSaveState === "saved"
        ? "Saved"
        : profileSaveState === "error"
          ? "Save failed"
          : "Ready";

  const cardClassName = "rounded-[24px] border p-5 sm:p-6";
  const surfaceStyle: CSSProperties = {
    borderColor: "var(--border)",
    background: "var(--surface)",
  };
  const insetSurfaceStyle: CSSProperties = {
    borderColor: "var(--border)",
    background: "var(--bg)",
  };
  const actionButtonClassName =
    "rounded-[20px] border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-[var(--border2)] hover:bg-[var(--surface-raised)]";
  const primaryButtonClassName =
    "rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:opacity-95 disabled:opacity-60";
  const pillButtonClassName =
    "rounded-full border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-px hover:border-[var(--border2)] hover:bg-[var(--surface-raised)]";

  return (
    <main className="min-h-dvh px-5 pb-28 pt-10 sm:pt-14">
      <div className="mx-auto w-full max-w-5xl animate-morph-in">
        <header
          className="rounded-[30px] border px-5 py-6 sm:px-7 sm:py-7"
          style={surfaceStyle}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile avatar"
                  className="h-20 w-20 rounded-[24px] border object-cover"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-[24px] border text-2xl font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                >
                  {getAvatarInitial(profile)}
                </div>
              )}

              <div>
                <div
                  className="inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Account</span>
                  <span>@{activeUsername}</span>
                  <span>Joined {formatAccountDate(initialProfile.createdAt)}</span>
                </div>

                <h1
                  className="pt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
                  style={{
                    color: "var(--text)",
                    fontFamily: "var(--font-grotesk-ui)",
                  }}
                >
                  {profile.displayName || `@${activeUsername}`}
                </h1>
                <p
                  className="max-w-2xl pt-2 text-sm leading-7 sm:text-base"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your profile, account settings, and workspace controls all live
                  here now.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-4 text-xs">
                  <span style={{ color: "var(--text-faint)" }}>Public page:</span>
                  <span style={{ color: "var(--text-muted)" }}>{publicUrl}</span>
                  <span
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg)",
                      color:
                        profileSaveState === "error"
                          ? "#c0392b"
                          : "var(--text-muted)",
                    }}
                  >
                    {profileSaveLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={publicPath}
                className={actionButtonClassName}
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">Open public page</div>
                <div
                  className="pt-1 text-xs leading-6"
                  style={{ color: "var(--text-muted)" }}
                >
                  Check how your `@username` page looks live.
                </div>
              </Link>

              <Link
                href="/dashboard/links"
                className={actionButtonClassName}
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                <div className="text-sm font-medium">Bio links editor</div>
                <div
                  className="pt-1 text-xs leading-6"
                  style={{ color: "var(--text-muted)" }}
                >
                  Update your public links, page style, and live preview.
                </div>
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <form
            onSubmit={handleProfileSubmit}
            className={cardClassName}
            style={surfaceStyle}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Profile
                </p>
                <h2
                  className="pt-2 text-xl font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Public identity
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div className="rounded-3xl border p-4" style={insetSurfaceStyle}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Current avatar"
                      className="h-20 w-20 rounded-[22px] border object-cover"
                      style={{ borderColor: "var(--border)" }}
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-[22px] border text-2xl font-semibold"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    >
                      {getAvatarInitial(profile)}
                    </div>
                  )}

                  <div className="flex-1">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      Profile photo
                    </div>
                    <p
                      className="pt-1 text-xs leading-6"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Upload a square image or keep the generated initial.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label
                      className={`cursor-pointer ${pillButtonClassName}`}
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                      }}
                    >
                      Upload
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </label>

                    {profile.avatar ? (
                      <button
                        type="button"
                        onClick={() =>
                          setProfile((current) => ({
                            ...current,
                            avatar: null,
                          }))
                        }
                        className={pillButtonClassName}
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface)",
                          color: "var(--text)",
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                {profileErrors.avatar?.[0] ? (
                  <p className="pt-3 text-xs" style={{ color: "#c0392b" }}>
                    {profileErrors.avatar[0]}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Name
                  </span>
                  <input
                    type="text"
                    maxLength={60}
                    value={profile.displayName}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="Your display name"
                  />
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {profileErrors.displayName?.[0] ?? ""}
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Username
                  </span>
                  <input
                    type="text"
                    maxLength={20}
                    value={profile.username}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        username: event.target.value.toLowerCase(),
                      }))
                    }
                    className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="lowercase_username"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span style={{ color: "var(--text-muted)" }}>{publicUrl}</span>
                    <span style={{ color: "var(--text-faint)" }}>
                      {checkingUsername
                        ? "checking..."
                        : usernameAvailable
                          ? "available"
                          : "taken"}
                    </span>
                  </div>
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {profileErrors.username?.[0] ??
                      (!usernameAvailable ? "That username is already taken." : "")}
                  </span>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Bio
                </span>
                <textarea
                  maxLength={160}
                  value={profile.bio}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                  className="min-h-[136px] w-full rounded-3xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="A short intro for your public page."
                />
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span style={{ color: "#c0392b" }}>
                    {profileErrors.bio?.[0] ?? ""}
                  </span>
                  <span style={{ color: "var(--text-faint)" }}>
                    {profile.bio.length}/160
                  </span>
                </div>
              </label>

              <div
                className="rounded-3xl border p-4"
                style={insetSurfaceStyle}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      Public URL
                    </div>
                    <p
                      className="pt-1 text-xs leading-6"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Your bio page always stays in the `/@username` format.
                    </p>
                  </div>

                  <div
                    className="rounded-2xl border px-4 py-3 text-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  >
                    {publicUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-xs"
                  style={{
                    color:
                      profileSaveState === "error"
                        ? "#c0392b"
                        : "var(--text-muted)",
                  }}
                >
                  {profileSaveLabel}
                </span>
                <button
                  type="submit"
                  disabled={profileSaveState === "saving"}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                  }}
                >
                  {profileSaveState === "saving" ? "Saving..." : "Save account"}
                </button>
              </div>
            </div>
          </form>

          <div className="grid gap-5">
            <section className={cardClassName} style={surfaceStyle}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Security
              </p>
              <h2
                className="pt-2 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Password
              </h2>
              <p
                className="pt-2 text-sm leading-7"
                style={{ color: "var(--text-muted)" }}
              >
                Change your password without leaving the page.
              </p>

              <form onSubmit={handlePasswordSubmit} className="grid gap-3 pt-5">
                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Current password
                  </span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {passwordErrors.currentPassword?.[0] ?? ""}
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    New password
                  </span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {passwordErrors.newPassword?.[0] ?? ""}
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Confirm password
                  </span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {passwordErrors.confirmPassword?.[0] ?? ""}
                  </span>
                </label>

                {passwordMessage ? (
                  <p
                    className="text-sm"
                    style={{
                      color: passwordMessage === "Password updated."
                        ? "var(--text-muted)"
                        : "#c0392b",
                    }}
                  >
                    {passwordMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className={`mt-1 ${primaryButtonClassName}`}
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                  }}
                >
                  {passwordSubmitting ? "Updating..." : "Update password"}
                </button>
              </form>
            </section>

            <section className={cardClassName} style={surfaceStyle}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Navigate
              </p>
              <h2
                className="pt-2 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Workspace
              </h2>
              <div className="grid gap-3 pt-5">
                {[
                  {
                    href: "/",
                    label: "Link shortener",
                    text: "Create and manage your short links.",
                  },
                  {
                    href: "/dashboard/links",
                    label: "Bio links",
                    text: "Design your public page and link stack.",
                  },
                  {
                    href: "/notes",
                    label: "Notes",
                    text: "Jump back into your private writing space.",
                  },
                  {
                    href: publicPath,
                    label: "Public page",
                    text: "Open the live `@username` profile visitors will see.",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={actionButtonClassName}
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div
                      className="pt-1 text-xs leading-6"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.text}
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className={cardClassName} style={surfaceStyle}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Preferences
              </p>
              <div className="grid gap-3 pt-5">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={actionButtonClassName}
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  <div className="text-sm font-medium">
                    {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
                  </div>
                  <div
                    className="pt-1 text-xs leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Toggle the app theme for this device.
                  </div>
                </button>

                <div
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  The profile screen now includes your settings directly. Only
                  data tools stay behind a separate button so the page stays
                  cleaner.
                </div>
              </div>
            </section>

            <section className={cardClassName} style={surfaceStyle}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Utilities
              </p>
              <h2
                className="pt-2 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Data and session
              </h2>
              <div className="grid gap-3 pt-5">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className={actionButtonClassName}
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                >
                  <div className="text-sm font-medium">Open data tools</div>
                  <div
                    className="pt-1 text-xs leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Database connections, import/export, and remote sync live here.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="rounded-[20px] border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-[#c0392b55] hover:bg-[color-mix(in_srgb,#c0392b_10%,transparent)] disabled:opacity-60"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                >
                  <div className="text-sm font-medium">
                    {signingOut ? "Signing out..." : "Sign out"}
                  </div>
                  <div
                    className="pt-1 text-xs leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    End this session and return to the sign-in page.
                  </div>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {settingsOpen ? (
        <DbPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </main>
  );
}
