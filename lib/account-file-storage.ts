import fs from "fs";
import path from "path";
import type { AccountUser, BioLink, PrivateNote } from "./account-types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const BIO_LINKS_FILE = path.join(DATA_DIR, "bio-links.json");
const PRIVATE_NOTES_FILE = path.join(DATA_DIR, "private-notes.json");

type UserMap = Record<string, AccountUser>;
type BioLinkMap = Record<string, BioLink>;
type PrivateNoteMap = Record<string, PrivateNote>;

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
    // Ignore write errors on read-only filesystems.
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

export function readPrivateNotesFile(): PrivateNoteMap {
  return readJsonFile<PrivateNoteMap>(PRIVATE_NOTES_FILE, {});
}

export function writePrivateNotesFile(notes: PrivateNoteMap): void {
  writeJsonFile(PRIVATE_NOTES_FILE, notes);
}
