import fs from "fs";
import path from "path";
import type {
  AccountUser,
  BioLink,
  BioProfile,
  PrivateNote,
} from "./account-types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const BIO_PROFILES_FILE = path.join(DATA_DIR, "bio-profiles.json");
const BIO_LINKS_FILE = path.join(DATA_DIR, "bio-links.json");
const PRIVATE_NOTES_FILE = path.join(DATA_DIR, "private-notes.json");

type UserMap = Record<string, AccountUser>;
type BioProfileMap = Record<string, BioProfile>;
type BioLinkMap = Record<string, BioLink>;
type PrivateNoteMap = Record<string, PrivateNote>;

function getStorageWriteErrorMessage(): string {
  if (process.env.VERCEL) {
    return "Storage is read-only on Vercel. Add DATABASE_TYPE and DATABASE_URL so links and notes can save.";
  }

  return "Unable to write data to local storage.";
}

function readJsonFile<T>(filename: string, fallback: T): T {
  if (!fs.existsSync(filename)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filename, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filename: string, value: unknown): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(filename, JSON.stringify(value, null, 2), "utf-8");
  } catch {
    throw new Error(getStorageWriteErrorMessage());
  }
}

export function readUsersFile(): UserMap {
  return readJsonFile<UserMap>(USERS_FILE, {});
}

export function writeUsersFile(users: UserMap): void {
  writeJsonFile(USERS_FILE, users);
}

export function readBioLinksFile(): BioLinkMap {
  return readJsonFile<BioLinkMap>(BIO_LINKS_FILE, {});
}

export function writeBioLinksFile(links: BioLinkMap): void {
  writeJsonFile(BIO_LINKS_FILE, links);
}

export function readBioProfilesFile(): BioProfileMap {
  return readJsonFile<BioProfileMap>(BIO_PROFILES_FILE, {});
}

export function writeBioProfilesFile(profiles: BioProfileMap): void {
  writeJsonFile(BIO_PROFILES_FILE, profiles);
}

export function readPrivateNotesFile(): PrivateNoteMap {
  return readJsonFile<PrivateNoteMap>(PRIVATE_NOTES_FILE, {});
}

export function writePrivateNotesFile(notes: PrivateNoteMap): void {
  writeJsonFile(PRIVATE_NOTES_FILE, notes);
}
