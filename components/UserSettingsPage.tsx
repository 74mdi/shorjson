"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { BioProfile } from "@/lib/account-types";
import { getPublicBioPath } from "@/lib/bio-shared";
import {
  bioProfileSchema,
  MAX_AVATAR_FILE_BYTES,
  passwordChangeSchema,
  USERNAME_PATTERN,
} from "@/lib/schemas";
import {
  applyTheme,
  getCurrentThemeIsDark,
  subscribeToTheme,
} from "@/lib/theme-client";

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
  const [signingOut, setSigningOut] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

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

  async function handleCopyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicLink(true);
      window.setTimeout(() => setCopiedPublicLink(false), 1600);
    } catch {
      setCopiedPublicLink(false);
    }
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

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setProfileErrors((current) => ({
        ...current,
        avatar: ["Avatar must be 1MB or less."],
      }));
      event.target.value = "";
      return;
    }

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

  const cardClassName =
    "rounded-[28px] border bg-[var(--surface)] p-6 shadow-[0_1px_0_var(--accent-glow)] sm:p-8";
  const fieldClassName =
    "w-full rounded-2xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]";
  const secondaryButtonClassName =
    "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm transition-all duration-200 hover:border-[var(--border2)] hover:bg-[var(--bg)]";
  const primaryButtonClassName =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:opacity-95 disabled:opacity-60";
  const workspaceLinks = [
    {
      href: "/",
      label: "Link shortener",
      text: "Create and manage short links.",
    },
    {
      href: "/dashboard/links",
      label: "Bio links",
      text: "Edit your public links page.",
    },
    {
      href: "/notes",
      label: "Notes",
      text: "Open your private notes workspace.",
    },
    {
      href: publicPath,
      label: "Public profile",
      text: "See the live page visitors get.",
    },
  ];

  return (
    <main className="min-h-dvh px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-3xl animate-morph-in">
        <header
          className={`${cardClassName} flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between`}
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-4 sm:gap-5">
            {profile.avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatar}
                alt="Profile avatar"
                className="h-16 w-16 rounded-2xl border object-cover sm:h-20 sm:w-20"
                style={{ borderColor: "var(--border)" }}
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-semibold sm:h-20 sm:w-20 sm:text-2xl"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              >
                {getAvatarInitial(profile)}
              </div>
            )}

            <div className="min-w-0">
              <div
                className="inline-flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                <span>Account</span>
                <span>@{activeUsername}</span>
                <span>Joined {formatAccountDate(initialProfile.createdAt)}</span>
              </div>

              <h1
                className="pt-3 text-3xl font-semibold tracking-tight sm:text-[2.25rem]"
                style={{
                  color: "var(--text)",
                  fontFamily: "var(--font-grotesk-ui)",
                }}
              >
                {profile.displayName || `@${activeUsername}`}
              </h1>

              <p
                className="max-w-xl pt-2 text-sm leading-7 sm:text-base"
                style={{ color: "var(--text-muted)" }}
              >
                Manage your public details, password, and the few account
                controls that matter most.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-4 text-xs">
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
                <span style={{ color: "var(--text-faint)" }}>{publicUrl}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href={publicPath}
              className={secondaryButtonClassName}
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              View profile
            </Link>
            <button
              type="button"
              onClick={() => void handleCopyPublicUrl()}
              className={secondaryButtonClassName}
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              {copiedPublicLink ? "Copied" : "Copy link"}
            </button>
          </div>
        </header>

        <div className="mt-4 grid gap-4">
          <form
            onSubmit={handleProfileSubmit}
            className={cardClassName}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: "var(--border)" }}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Profile
              </p>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                Public details
              </h2>
              <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                Keep your public page simple and up to date.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div
                className="flex flex-col gap-4 rounded-3xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div className="flex items-center gap-4">
                  {profile.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.avatar}
                      alt="Current avatar"
                      className="h-14 w-14 rounded-2xl border object-cover"
                      style={{ borderColor: "var(--border)" }}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border text-lg font-semibold"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                      }}
                    >
                      {getAvatarInitial(profile)}
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      Avatar
                    </div>
                    <p className="pt-1 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
                      Upload a square image or keep the generated initial.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label
                    className={`cursor-pointer ${secondaryButtonClassName}`}
                    style={{
                      borderColor: "var(--border)",
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
                      className={secondaryButtonClassName}
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              {profileErrors.avatar?.[0] ? (
                <p className="text-xs" style={{ color: "#c0392b" }}>
                  {profileErrors.avatar[0]}
                </p>
              ) : null}

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
                    className={fieldClassName}
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
                    className={fieldClassName}
                    style={{ borderColor: "var(--border)" }}
                    placeholder="lowercase_username"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span
                      className="truncate"
                      style={{ color: "var(--text-muted)" }}
                      title={publicUrl}
                    >
                      {publicUrl}
                    </span>
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
                  className={`min-h-[140px] ${fieldClassName}`}
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

              <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Public URL
                  </p>
                  <p
                    className="break-all pt-1 text-xs leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {publicUrl}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={profileSaveState === "saving"}
                  className={primaryButtonClassName}
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                  }}
                >
                  {profileSaveState === "saving" ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>

          <form
            onSubmit={handlePasswordSubmit}
            className={cardClassName}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: "var(--border)" }}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Security
              </p>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                Password
              </h2>
              <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                Update your password without leaving this page.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
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
                  className={fieldClassName}
                  style={{ borderColor: "var(--border)" }}
                />
                <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                  {passwordErrors.currentPassword?.[0] ?? ""}
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    className={fieldClassName}
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
                    className={fieldClassName}
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="min-h-[16px] text-[11px]" style={{ color: "#c0392b" }}>
                    {passwordErrors.confirmPassword?.[0] ?? ""}
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
                <p
                  className="text-sm"
                  style={{
                    color:
                      passwordMessage === "Password updated."
                        ? "var(--text-muted)"
                        : passwordMessage
                          ? "#c0392b"
                          : "var(--text-faint)",
                  }}
                >
                  {passwordMessage || "Choose a strong password you do not reuse elsewhere."}
                </p>

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className={primaryButtonClassName}
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                  }}
                >
                  {passwordSubmitting ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </form>

          <section
            className={cardClassName}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: "var(--border)" }}>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Utilities
              </p>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                Workspace
              </h2>
              <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                Quick links and a couple of account actions.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {workspaceLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border px-4 py-4 transition-all duration-200 hover:border-[var(--border2)] hover:bg-[var(--bg)]"
                  style={{
                    borderColor: "var(--border)",
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

            <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={toggleTheme}
                className={secondaryButtonClassName}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                {mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm transition-all duration-200 hover:border-[#c0392b55] hover:bg-[color-mix(in_srgb,#c0392b_8%,transparent)] disabled:opacity-60"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
