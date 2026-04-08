import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { requireAuthenticatedRequest, jsonWithOptionalRefresh } from "@/lib/api-auth";
import { getLink, setLink } from "@/lib/adapter-utils";
import type { BioProfile } from "@/lib/account-types";
import { createScopedResourceId } from "@/lib/account-types";
import {
  ensureBioProfileForUser,
  getPrivateNoteBySlug,
  saveBioLink,
  saveBioProfile,
  savePrivateNote,
} from "@/lib/account-data";
import {
  bioLinkCreateSchema,
  bioProfileSchema,
  bioStyleSchema,
  noteCreateSchema,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

type ImportSummary = {
  bioLinksImported: number;
  bioLinksSkipped: number;
  notesImported: number;
  notesSkipped: number;
  profileImported: boolean;
  shortLinksImported: number;
  shortLinksSkipped: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIsoOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getImportedSlug(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const slug = value.trim().toLowerCase();
  if (!slug) return undefined;
  return /^[a-z0-9_-]{1,50}$/.test(slug) ? slug : undefined;
}

async function generateUniqueShortId(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = nanoid(7);
    if (!(await getLink(candidate))) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique short ID.");
}

async function importProfile(
  rawProfile: Record<string, unknown>,
  currentProfile: BioProfile,
  now: string,
): Promise<BioProfile | null> {
  const profileResult = bioProfileSchema.safeParse({
    displayName: rawProfile.displayName ?? currentProfile.displayName,
    username: currentProfile.username,
    bio: rawProfile.bio ?? currentProfile.bio,
    avatar: rawProfile.avatar ?? currentProfile.avatar,
  });
  const styleResult = bioStyleSchema.safeParse({
    buttonStyle: rawProfile.buttonStyle ?? currentProfile.buttonStyle,
    accentColor: rawProfile.accentColor ?? currentProfile.accentColor,
    themePreset: rawProfile.themePreset ?? currentProfile.themePreset,
    fontPreset: rawProfile.fontPreset ?? currentProfile.fontPreset,
    animationPreset: rawProfile.animationPreset ?? currentProfile.animationPreset,
    backgroundStyle: rawProfile.backgroundStyle ?? currentProfile.backgroundStyle,
    buttonSize: rawProfile.buttonSize ?? currentProfile.buttonSize,
    buttonBlur: rawProfile.buttonBlur ?? currentProfile.buttonBlur,
    pageWidth: rawProfile.pageWidth ?? currentProfile.pageWidth,
    buttonLabelStyle:
      rawProfile.buttonLabelStyle ?? currentProfile.buttonLabelStyle,
    watermarkText: rawProfile.watermarkText ?? currentProfile.watermarkText,
  });

  if (!profileResult.success || !styleResult.success) {
    return null;
  }

  const nextProfile: BioProfile = {
    ...currentProfile,
    ...profileResult.data,
    ...styleResult.data,
    showThemeToggle:
      typeof rawProfile.showThemeToggle === "boolean"
        ? rawProfile.showThemeToggle
        : currentProfile.showThemeToggle,
    updatedAt: now,
  };

  await saveBioProfile(nextProfile);
  return nextProfile;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request, {
    requireCsrf: true,
  });
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return jsonWithOptionalRefresh(
      { error: "Import file is invalid." },
      { status: 400 },
      auth.refreshedToken,
    );
  }

  const currentProfile = await ensureBioProfileForUser(auth.session.userId);
  if (!currentProfile) {
    return jsonWithOptionalRefresh(
      { error: "Profile not found." },
      { status: 404 },
      auth.refreshedToken,
    );
  }

  const now = new Date().toISOString();
  const importedUser =
    isRecord(body.user) && typeof body.user.id === "string" ? body.user : null;
  const preserveResourceIds = importedUser?.id === auth.session.userId;
  const summary: ImportSummary = {
    bioLinksImported: 0,
    bioLinksSkipped: 0,
    notesImported: 0,
    notesSkipped: 0,
    profileImported: false,
    shortLinksImported: 0,
    shortLinksSkipped: 0,
  };

  let nextProfile = currentProfile;

  if (isRecord(body.bioProfile)) {
    const importedProfile = await importProfile(body.bioProfile, currentProfile, now);
    if (importedProfile) {
      nextProfile = importedProfile;
      summary.profileImported = true;
    }
  }

  const importedBioLinks = Array.isArray(body.bioLinks) ? body.bioLinks : [];
  for (const [index, entry] of importedBioLinks.entries()) {
    if (!isRecord(entry)) {
      summary.bioLinksSkipped += 1;
      continue;
    }

    const parsedLink = bioLinkCreateSchema.safeParse({
      title: entry.title,
      url: entry.url,
      icon: entry.icon,
      iconColor: entry.iconColor,
      section: entry.section,
      visible: entry.visible,
    });

    if (!parsedLink.success) {
      summary.bioLinksSkipped += 1;
      continue;
    }

    await saveBioLink({
      id:
        preserveResourceIds && typeof entry.id === "string" && entry.id
          ? entry.id
          : createScopedResourceId(auth.session.userId),
      userId: auth.session.userId,
      profileId: nextProfile.id,
      order:
        typeof entry.order === "number" &&
        Number.isFinite(entry.order) &&
        entry.order >= 0
          ? Math.floor(entry.order)
          : index,
      createdAt: toIsoOr(entry.createdAt, now),
      ...parsedLink.data,
    });
    summary.bioLinksImported += 1;
  }

  const importedNotes = Array.isArray(body.notes) ? body.notes : [];
  for (const entry of importedNotes) {
    if (!isRecord(entry)) {
      summary.notesSkipped += 1;
      continue;
    }

    const parsedNote = noteCreateSchema.safeParse({
      title: entry.title,
      content: entry.content,
    });

    if (!parsedNote.success) {
      summary.notesSkipped += 1;
      continue;
    }

    const noteId =
      preserveResourceIds && typeof entry.id === "string" && entry.id
        ? entry.id
        : createScopedResourceId(auth.session.userId);
    let slug = getImportedSlug(entry.slug);

    if (slug) {
      const existingNote = await getPrivateNoteBySlug(slug);
      if (existingNote && existingNote.id !== noteId) {
        slug = undefined;
      }
    }

    await savePrivateNote({
      id: noteId,
      userId: auth.session.userId,
      title: parsedNote.data.title,
      content: parsedNote.data.content,
      isPublic: typeof entry.isPublic === "boolean" ? entry.isPublic : undefined,
      slug,
      passwordHash:
        typeof entry.passwordHash === "string" ? entry.passwordHash : undefined,
      passwordSalt:
        typeof entry.passwordSalt === "string" ? entry.passwordSalt : undefined,
      createdAt: toIsoOr(entry.createdAt, now),
      updatedAt: toIsoOr(entry.updatedAt, now),
    });
    summary.notesImported += 1;
  }

  const importedShortLinks = Array.isArray(body.shortLinks) ? body.shortLinks : [];
  for (const entry of importedShortLinks) {
    if (!isRecord(entry)) {
      summary.shortLinksSkipped += 1;
      continue;
    }

    const originalUrl =
      typeof entry.originalUrl === "string" ? entry.originalUrl.trim() : "";
    if (!originalUrl || !isHttpUrl(originalUrl)) {
      summary.shortLinksSkipped += 1;
      continue;
    }

    let shortId =
      preserveResourceIds && typeof entry.shortId === "string" && entry.shortId
        ? entry.shortId
        : await generateUniqueShortId();
    const existingLink = await getLink(shortId);

    if (existingLink && existingLink.userId !== auth.session.userId) {
      if (preserveResourceIds) {
        summary.shortLinksSkipped += 1;
        continue;
      }

      shortId = await generateUniqueShortId();
    }

    await setLink(shortId, {
      originalUrl,
      createdAt: toIsoOr(entry.createdAt, now),
      clicks:
        typeof entry.clicks === "number" &&
        Number.isFinite(entry.clicks) &&
        entry.clicks >= 0
          ? Math.floor(entry.clicks)
          : 0,
      userId: auth.session.userId,
      ...(typeof entry.clickLimit === "number" &&
      Number.isInteger(entry.clickLimit) &&
      entry.clickLimit > 0
        ? { clickLimit: entry.clickLimit }
        : {}),
      ...(entry.expiresAt === null
        ? { expiresAt: null }
        : typeof entry.expiresAt === "string"
          ? { expiresAt: toIsoOr(entry.expiresAt, now) }
          : {}),
      ...(typeof entry.passwordHash === "string"
        ? { passwordHash: entry.passwordHash }
        : {}),
      ...(typeof entry.passwordSalt === "string"
        ? { passwordSalt: entry.passwordSalt }
        : {}),
    });
    summary.shortLinksImported += 1;
  }

  return jsonWithOptionalRefresh(
    {
      ok: true,
      profile: nextProfile,
      summary,
    },
    undefined,
    auth.refreshedToken,
  );
}
