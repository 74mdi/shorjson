// lib/storage.ts
// Persistent storage layer — reads and writes data/links.json.
//
// Schema (current):
//   { [shortId]: { originalUrl, createdAt, clicks } }
//
// Schema (legacy — auto-migrated on first read):
//   { [shortId]: "https://original-url..." }

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

// ── Types ─────────────────────────────────────────────────────────────────────

/** Rich metadata stored for every shortened link. */
export interface LinkEntry {
  /** The original long URL this short ID resolves to. */
  originalUrl: string;
  /** ISO-8601 timestamp of when the link was first shortened. */
  createdAt: string;
  /** Total number of times the short link has been followed (redirected). */
  clicks: number;
}

/** The full on-disk map: shortId → LinkEntry */
export type LinksMap = Record<string, LinkEntry>;

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Normalise a raw stored value into a LinkEntry.
 * Handles the old format where the value was a plain URL string.
 */
function normalise(value: unknown): LinkEntry {
  if (typeof value === "string") {
    // Legacy format — wrap in a LinkEntry with a synthetic timestamp
    return {
      originalUrl: value,
      createdAt: new Date().toISOString(),
      clicks: 0,
    };
  }

  // Already a LinkEntry (trust the shape; bad data simply passes through)
  return value as LinkEntry;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read every link from disk.
 * Returns an empty object when the file does not yet exist.
 * Automatically migrates legacy string-valued entries to the LinkEntry shape
 * and persists the migration so subsequent reads are clean.
 */
export function readLinks(): LinksMap {
  if (!fs.existsSync(DATA_FILE)) return {};

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    // Corrupted file — start fresh rather than crash
    return {};
  }

  const result: LinksMap = {};
  let needsMigration = false;

  for (const [id, value] of Object.entries(raw)) {
    result[id] = normalise(value);
    if (typeof value === "string") needsMigration = true;
  }

  // Persist migration immediately so the next read never has to do it again
  if (needsMigration) {
    writeLinks(result);
  }

  return result;
}

/**
 * Write the full links map to disk, creating the data/ directory if needed.
 */
export function writeLinks(links: LinksMap): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors on read-only filesystems (e.g. Vercel).
    // Set DATABASE_URL + DATABASE_TYPE env vars to enable persistent storage.
  }
}

/**
 * Increment the click counter for the given short ID.
 *
 * Pass an already-loaded `links` map to avoid a second disk read.
 * If omitted the map is loaded fresh from disk.
 */
export function incrementClicks(shortId: string, links?: LinksMap): void {
  const data = links ?? readLinks();
  if (!data[shortId]) return;

  data[shortId] = {
    ...data[shortId],
    clicks: data[shortId].clicks + 1,
  };

  writeLinks(data);
}
