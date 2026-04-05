import { getActiveAdapter } from "./db-adapter";
import {
  readBioLinksFile,
  readBioProfilesFile,
  readPrivateNotesFile,
  readUsersFile,
  writeBioLinksFile,
  writeBioProfilesFile,
  writePrivateNotesFile,
  writeUsersFile,
} from "./account-file-storage";
import type {
  AccountUser,
  BioLink,
  BioProfile,
  PrivateNote,
} from "./account-types";
import {
  isAnimationPreset,
  isButtonStyle,
  isFontPreset,
  isThemePreset,
} from "./account-types";

function normalisePrivateNote(note: PrivateNote | Record<string, unknown>): PrivateNote {
  return {
    id: String(note.id ?? ""),
    userId: String(note.userId ?? ""),
    title: typeof note.title === "string" ? note.title : "",
    content: typeof note.content === "string" ? note.content : "",
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
    watermarkText:
      typeof profile.watermarkText === "string" && profile.watermarkText.trim()
        ? profile.watermarkText.trim()
        : "made with shor",
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
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getAccountUserById(userId);
  }

  return readUsersFile()[userId] ?? null;
}

export async function getUserByUsername(
  username: string,
): Promise<AccountUser | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getAccountUserByUsername(username);
  }

  return (
    Object.values(readUsersFile()).find((user) => user.username === username) ??
    null
  );
}

export async function createUser(user: AccountUser): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.createAccountUser(user);
    return;
  }

  const users = readUsersFile();
  users[user.id] = user;
  writeUsersFile(users);
}

export async function updateUser(user: AccountUser): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.updateAccountUser(user);
    return;
  }

  const users = readUsersFile();
  users[user.id] = user;
  writeUsersFile(users);
}

export async function getBioProfileByUserId(
  userId: string,
): Promise<BioProfile | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getBioProfileByUserId(userId);
  }

  const user = await getUserById(userId);
  const profile = Object.values(readBioProfilesFile()).find(
    (value) => value.userId === userId,
  );
  if (!profile) return null;

  return normaliseBioProfile(profile, user?.username ?? "");
}

export async function getBioProfileByUsername(
  username: string,
): Promise<BioProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getBioProfileByUsername(normalizedUsername);
  }

  const profile = Object.values(readBioProfilesFile()).find(
    (value) =>
      typeof value.username === "string" &&
      value.username.toLowerCase() === normalizedUsername,
  );
  if (!profile) return null;

  return normaliseBioProfile(profile, normalizedUsername);
}

export async function saveBioProfile(profile: BioProfile): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.writeBioProfile(profile);
    return;
  }

  const profiles = readBioProfilesFile();
  profiles[profile.id] = normaliseBioProfile(profile, profile.username);
  writeBioProfilesFile(profiles);
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
    watermarkText: "made with shor",
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
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.readBioLinks(userId);
  }

  const profile = await ensureBioProfileForUser(userId);

  return sortBioLinks(
    Object.values(readBioLinksFile())
      .map((link) => normaliseBioLink(link, userId, profile?.id ?? ""))
      .filter((link) => link.userId === userId),
  );
}

export async function getBioLinkById(
  userId: string,
  id: string,
): Promise<BioLink | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getBioLinkById(userId, id);
  }

  const profile = await ensureBioProfileForUser(userId);
  const link = readBioLinksFile()[id];
  if (!link || link.userId !== userId) return null;
  return normaliseBioLink(link, userId, profile?.id ?? "");
}

export async function saveBioLink(link: BioLink): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.writeBioLink(link);
    return;
  }

  const links = readBioLinksFile();
  links[link.id] = normaliseBioLink(link, link.userId, link.profileId);
  writeBioLinksFile(links);
}

export async function deleteBioLink(
  userId: string,
  id: string,
): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.deleteBioLink(userId, id);
    return;
  }

  const links = readBioLinksFile();
  if (links[id]?.userId === userId) {
    delete links[id];
    writeBioLinksFile(links);
  }
}

export async function listPrivateNotes(userId: string): Promise<PrivateNote[]> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.readPrivateNotes(userId);
  }

  return sortPrivateNotes(
    Object.values(readPrivateNotesFile())
      .map((note) => normalisePrivateNote(note))
      .filter((note) => note.userId === userId),
  );
}

export async function getPrivateNoteById(
  userId: string,
  id: string,
): Promise<PrivateNote | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getPrivateNoteById(userId, id);
  }

  const note = readPrivateNotesFile()[id];
  if (!note || note.userId !== userId) return null;
  return normalisePrivateNote(note);
}

export async function savePrivateNote(note: PrivateNote): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.writePrivateNote(note);
    return;
  }

  const notes = readPrivateNotesFile();
  notes[note.id] = note;
  writePrivateNotesFile(notes);
}

export async function deletePrivateNote(
  userId: string,
  id: string,
): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.deletePrivateNote(userId, id);
    return;
  }

  const notes = readPrivateNotesFile();
  if (notes[id]?.userId === userId) {
    delete notes[id];
    writePrivateNotesFile(notes);
  }
}
