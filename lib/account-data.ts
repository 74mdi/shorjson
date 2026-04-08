import { getActiveAdapter } from "./db-adapter";
import type {
  AccountUser,
  BioLink,
  BioProfile,
  PrivateNote,
} from "./account-types";
import {
  isAnimationPreset,
  isBackgroundStyle,
  isButtonBlur,
  isButtonLabelStyle,
  isButtonStyle,
  isButtonSize,
  isFontPreset,
  isPageWidth,
  isThemePreset,
} from "./account-types";

function normalisePrivateNote(note: PrivateNote | Record<string, unknown>): PrivateNote {
  return {
    id: String(note.id ?? ""),
    userId: String(note.userId ?? ""),
    title: typeof note.title === "string" ? note.title : "",
    content: typeof note.content === "string" ? note.content : "",
    slug: typeof note.slug === "string" ? note.slug : undefined,
    passwordHash: typeof note.passwordHash === "string" ? note.passwordHash : undefined,
    passwordSalt: typeof note.passwordSalt === "string" ? note.passwordSalt : undefined,
    isPublic: typeof note.isPublic === "boolean" ? note.isPublic : undefined,
    createdAt: String(note.createdAt ?? new Date().toISOString()),
    updatedAt: String(note.updatedAt ?? note.createdAt ?? new Date().toISOString()),
  };
}

function normaliseBioProfile(
  profile: BioProfile | Record<string, unknown>,
  fallbackUsername = "",
): BioProfile {
  const username =
    typeof profile.username === "string" && profile.username.trim()
      ? profile.username.trim().toLowerCase()
      : fallbackUsername.toLowerCase();

  return {
    id: String(profile.id ?? ""),
    userId: String(profile.userId ?? ""),
    username,
    displayName:
      typeof profile.displayName === "string" ? profile.displayName : "",
    bio: typeof profile.bio === "string" ? profile.bio : "",
    avatar:
      typeof profile.avatar === "string" && profile.avatar
        ? profile.avatar
        : null,
    buttonStyle:
      typeof profile.buttonStyle === "string" &&
      isButtonStyle(profile.buttonStyle)
        ? profile.buttonStyle
        : "minimal",
    accentColor:
      typeof profile.accentColor === "string" && profile.accentColor
        ? profile.accentColor
        : "#d97b4a",
    themePreset:
      typeof profile.themePreset === "string" &&
      isThemePreset(profile.themePreset)
        ? profile.themePreset
        : "mono",
    fontPreset:
      typeof profile.fontPreset === "string" &&
      isFontPreset(profile.fontPreset)
        ? profile.fontPreset
        : "sans",
    animationPreset:
      typeof profile.animationPreset === "string" &&
      isAnimationPreset(profile.animationPreset)
        ? profile.animationPreset
        : "morph",
    backgroundStyle:
      typeof profile.backgroundStyle === "string" &&
      isBackgroundStyle(profile.backgroundStyle)
        ? profile.backgroundStyle
        : "plain",
    buttonSize:
      typeof profile.buttonSize === "string" && isButtonSize(profile.buttonSize)
        ? profile.buttonSize
        : "balanced",
    buttonBlur:
      typeof profile.buttonBlur === "string" && isButtonBlur(profile.buttonBlur)
        ? profile.buttonBlur
        : "soft",
    pageWidth:
      typeof profile.pageWidth === "string" && isPageWidth(profile.pageWidth)
        ? profile.pageWidth
        : "standard",
    buttonLabelStyle:
      typeof profile.buttonLabelStyle === "string" &&
      isButtonLabelStyle(profile.buttonLabelStyle)
        ? profile.buttonLabelStyle
        : "normal",
    watermarkText:
      typeof profile.watermarkText === "string" && profile.watermarkText.trim()
        ? profile.watermarkText.trim()
        : "made with koki",
    showThemeToggle:
      typeof profile.showThemeToggle === "boolean"
        ? profile.showThemeToggle
        : false,
    createdAt: String(profile.createdAt ?? new Date().toISOString()),
    updatedAt: String(profile.updatedAt ?? profile.createdAt ?? new Date().toISOString()),
  };
}

function normaliseBioLink(
  link: BioLink | Record<string, unknown>,
  fallbackUserId = "",
  fallbackProfileId = "",
): BioLink {
  return {
    id: String(link.id ?? ""),
    userId:
      typeof link.userId === "string" && link.userId
        ? link.userId
        : fallbackUserId,
    profileId:
      typeof link.profileId === "string" && link.profileId
        ? link.profileId
        : fallbackProfileId,
    title: typeof link.title === "string" ? link.title : "",
    url: typeof link.url === "string" ? link.url : "",
    icon:
      typeof link.icon === "string" && link.icon.trim() ? link.icon : "🔗",
    iconColor:
      typeof link.iconColor === "string" && link.iconColor.trim()
        ? link.iconColor
        : "#1c1916",
    section:
      typeof link.section === "string" && link.section.trim()
        ? link.section
        : "main",
    visible:
      typeof link.visible === "boolean"
        ? link.visible
        : true,
    order: typeof link.order === "number" ? link.order : 0,
    createdAt: String(link.createdAt ?? new Date().toISOString()),
  };
}

function sortBioLinks(items: BioLink[]): BioLink[] {
  return [...items].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

function sortPrivateNotes(items: PrivateNote[]): PrivateNote[] {
  return [...items].sort((left, right) => {
    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export async function getUserById(userId: string): Promise<AccountUser | null> {
  return (await getActiveAdapter()).getAccountUserById(userId);
}

export async function getUserByUsername(
  username: string,
): Promise<AccountUser | null> {
  return (await getActiveAdapter()).getAccountUserByUsername(username);
}

export async function createUser(user: AccountUser): Promise<void> {
  await (await getActiveAdapter()).createAccountUser(user);
}

export async function updateUser(user: AccountUser): Promise<void> {
  await (await getActiveAdapter()).updateAccountUser(user);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await (await getActiveAdapter()).deleteAccountUser(userId);
}

export async function getBioProfileByUserId(
  userId: string,
): Promise<BioProfile | null> {
  return (await getActiveAdapter()).getBioProfileByUserId(userId);
}

export async function getBioProfileByUsername(
  username: string,
): Promise<BioProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  return (await getActiveAdapter()).getBioProfileByUsername(normalizedUsername);
}

export async function saveBioProfile(profile: BioProfile): Promise<void> {
  await (await getActiveAdapter()).writeBioProfile(
    normaliseBioProfile(profile, profile.username),
  );
}

export async function ensureBioProfileForUser(
  userId: string,
): Promise<BioProfile | null> {
  const [user, existingProfile] = await Promise.all([
    getUserById(userId),
    getBioProfileByUserId(userId),
  ]);

  if (!user) return null;
  if (existingProfile) return existingProfile;

  const now = new Date().toISOString();
  const profile = {
    id: `${userId}.profile`,
    userId,
    username: user.username.toLowerCase(),
    displayName: "",
    bio: "",
    avatar: null,
    buttonStyle: "minimal",
    accentColor: "#d97b4a",
    themePreset: "mono",
    fontPreset: "sans",
    animationPreset: "morph",
    backgroundStyle: "plain",
    buttonSize: "balanced",
    buttonBlur: "soft",
    pageWidth: "standard",
    buttonLabelStyle: "normal",
    watermarkText: "made with koki",
    showThemeToggle: false,
    createdAt: now,
    updatedAt: now,
  } satisfies BioProfile;

  await saveBioProfile(profile);
  return profile;
}

export async function isBioUsernameAvailable(
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return false;

  const existingUser = await getUserByUsername(normalizedUsername);
  if (existingUser && (!currentUserId || existingUser.id !== currentUserId)) {
    return false;
  }

  const existingProfile = await getBioProfileByUsername(normalizedUsername);
  if (!existingProfile) return true;

  return currentUserId ? existingProfile.userId === currentUserId : false;
}

export async function listBioLinks(userId: string): Promise<BioLink[]> {
  return sortBioLinks(await (await getActiveAdapter()).readBioLinks(userId));
}

export async function getBioLinkById(
  userId: string,
  id: string,
): Promise<BioLink | null> {
  return (await getActiveAdapter()).getBioLinkById(userId, id);
}

export async function saveBioLink(link: BioLink): Promise<void> {
  await (await getActiveAdapter()).writeBioLink(
    normaliseBioLink(link, link.userId, link.profileId),
  );
}

export async function deleteBioLink(
  userId: string,
  id: string,
): Promise<void> {
  await (await getActiveAdapter()).deleteBioLink(userId, id);
}

export async function listPrivateNotes(userId: string): Promise<PrivateNote[]> {
  return sortPrivateNotes(await (await getActiveAdapter()).readPrivateNotes(userId));
}

export async function getPrivateNoteById(
  userId: string,
  id: string,
): Promise<PrivateNote | null> {
  return (await getActiveAdapter()).getPrivateNoteById(userId, id);
}

export async function getPrivateNoteBySlug(slug: string): Promise<PrivateNote | null> {
  return (await getActiveAdapter()).getPrivateNoteBySlug(slug);
}

export async function savePrivateNote(note: PrivateNote): Promise<void> {
  await (await getActiveAdapter()).writePrivateNote(
    normalisePrivateNote(note),
  );
}

export async function deletePrivateNote(
  userId: string,
  id: string,
): Promise<void> {
  await (await getActiveAdapter()).deletePrivateNote(userId, id);
}
