// lib/notes-storage.ts
// Persistent JSON storage for notes, mirroring the pattern of lib/storage.ts.
// Data lives at data/notes.json as Record<id, Note>.

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

export interface Note {
  id: string;
  title: string; // short title (may be empty)
  content: string; // body text (may be empty if title is set)
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export type NotesMap = Record<string, Note>;

export function readNotes(): NotesMap {
  if (!fs.existsSync(NOTES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8")) as NotesMap;
  } catch {
    return {};
  }
}

export function writeNotes(notes: NotesMap): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors on read-only filesystems (e.g. Vercel).
    // Set DATABASE_URL + DATABASE_TYPE env vars to enable persistent storage.
  }
}
