// lib/adapter-utils.ts
// Unified async storage API.
// Routes import these helpers instead of calling readLinks/writeLinks directly.
// Internally: uses active DB adapter when configured, falls back to local JSON.

import { getActiveAdapter } from "./db-adapter";
import {
  readLinks  as readLinksFile,
  writeLinks,
  incrementClicks as incClicksFile,
  type LinksMap,
  type LinkEntry,
} from "./storage";
import {
  readNotes  as readNotesFile,
  writeNotes,
  type Note,
} from "./notes-storage";

// ── Links ─────────────────────────────────────────────────────────────────────

export async function getLinks(): Promise<LinksMap> {
  const a = await getActiveAdapter().catch(() => null);
  return a ? a.readLinks() : readLinksFile();
}

export async function setLink(id: string, entry: LinkEntry): Promise<void> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) { await a.writeLink(id, entry); return; }
  const links = readLinksFile();
  links[id] = entry;
  writeLinks(links);
}

export async function removeLink(id: string): Promise<void> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) { await a.deleteLink(id); return; }
  const links = readLinksFile();
  delete links[id];
  writeLinks(links);
}

/**
 * Increment the click counter for a short link.
 * Pass `localLinks` (already loaded LinksMap) to skip a second disk read
 * when the file adapter is active.
 */
export async function clickLink(id: string, localLinks?: LinksMap): Promise<void> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) { await a.incrementLinkClicks(id); return; }
  incClicksFile(id, localLinks);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

/** Returns notes sorted newest-updatedAt first. */
export async function getNotes(): Promise<Note[]> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) return a.readNotes();
  return Object.values(readNotesFile()).sort(
    (x, y) => new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime(),
  );
}

export async function getNoteById(id: string): Promise<Note | null> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) {
    const all = await a.readNotes();
    return all.find((n) => n.id === id) ?? null;
  }
  return readNotesFile()[id] ?? null;
}

export async function setNote(id: string, note: Note): Promise<void> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) { await a.writeNote(id, note); return; }
  const notes = readNotesFile();
  notes[id] = note;
  writeNotes(notes);
}

export async function removeNote(id: string): Promise<void> {
  const a = await getActiveAdapter().catch(() => null);
  if (a) { await a.deleteNote(id); return; }
  const notes = readNotesFile();
  delete notes[id];
  writeNotes(notes);
}
