// lib/db-adapter.ts
// Database adapter interface + MongoDB and PostgreSQL implementations.
// All adapters expose the same async interface so routes stay adapter-agnostic.

import type { LinksMap, LinkEntry } from "./storage";
import type { Note } from "./notes-storage";
import { getActiveConnection } from "./db-connections";

// ── Interface ─────────────────────────────────────────────────────────────────

export interface DataAdapter {
  readLinks(): Promise<LinksMap>;
  writeLink(id: string, entry: LinkEntry): Promise<void>;
  deleteLink(id: string): Promise<void>;
  incrementLinkClicks(id: string): Promise<void>;

  readNotes(): Promise<Note[]>; // sorted newest-updatedAt first
  writeNote(id: string, note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;

  ping(): Promise<void>;
  close(): Promise<void>;
}

// ── Global connection cache ────────────────────────────────────────────────────
// Re-uses the same adapter across hot-reloads in dev (Next.js module caching).

const g = globalThis as {
  _shorAdapter?: DataAdapter;
  _shorAdapterConnId?: string;
};

export async function getActiveAdapter(): Promise<DataAdapter | null> {
  // ── Environment-variable override (Vercel / cloud deployments) ──────────
  // When DATABASE_URL + DATABASE_TYPE are set, they take priority over the
  // config-file approach so the app works on read-only serverless platforms.
  const envUrl = process.env.DATABASE_URL?.trim();
  const envType = process.env.DATABASE_TYPE?.trim();

  if (envUrl && envType) {
    const envKey = `env:${envType}:${envUrl}`;
    if (g._shorAdapter && g._shorAdapterConnId === envKey) {
      return g._shorAdapter; // reuse cached adapter
    }
    if (g._shorAdapter) {
      await g._shorAdapter.close().catch(() => {});
      g._shorAdapter = undefined;
      g._shorAdapterConnId = undefined;
    }
    const adapter = await buildAdapter(envType, envUrl);
    g._shorAdapter = adapter;
    g._shorAdapterConnId = envKey;
    return adapter;
  }

  // ── Config-file approach (local / self-hosted) ───────────────────────────
  const conn = getActiveConnection();
  if (!conn) return null;

  if (g._shorAdapter && g._shorAdapterConnId === conn.id) {
    return g._shorAdapter;
  }

  if (g._shorAdapter) {
    await g._shorAdapter.close().catch(() => {});
    g._shorAdapter = undefined;
    g._shorAdapterConnId = undefined;
  }

  const adapter = await buildAdapter(conn.type, conn.connectionString);
  g._shorAdapter = adapter;
  g._shorAdapterConnId = conn.id;
  return adapter;
}

export async function clearAdapterCache(): Promise<void> {
  if (g._shorAdapter) {
    await g._shorAdapter.close().catch(() => {});
    g._shorAdapter = undefined;
    g._shorAdapterConnId = undefined;
  }
}

async function buildAdapter(type: string, cs: string): Promise<DataAdapter> {
  switch (type) {
    case "mongodb":
      return mongoAdapter(cs);
    case "postgresql":
      return pgAdapter(cs);
    case "mysql":
      throw new Error("MySQL adapter requires: npm install mysql2");
    case "sqlite":
      throw new Error("SQLite adapter requires: npm install better-sqlite3");
    case "redis":
      throw new Error("Redis adapter requires: npm install ioredis");
    default:
      throw new Error(`Unknown database type: ${type}`);
  }
}

// ── MongoDB adapter ───────────────────────────────────────────────────────────

async function mongoAdapter(connectionString: string): Promise<DataAdapter> {
  // Dynamic import so the package is optional at build time
  const { MongoClient } = await import("mongodb").catch(() => {
    throw new Error("MongoDB driver not installed. Run: npm install mongodb");
  });

  const client = new MongoClient(connectionString);
  await client.connect();
  const db = client.db(); // uses the db name from the connection string

  return {
    async readLinks(): Promise<LinksMap> {
      const docs = await db.collection("shor_links").find().toArray();
      const map: LinksMap = {};
      for (const doc of docs) {
        map[String(doc._id)] = {
          originalUrl: doc.originalUrl as string,
          createdAt: doc.createdAt as string,
          clicks: (doc.clicks as number) ?? 0,
        };
      }
      return map;
    },

    async writeLink(id, entry) {
      await db
        .collection("shor_links")
        .replaceOne(
          { _id: id as unknown as object },
          { _id: id as unknown as object, ...entry },
          { upsert: true },
        );
    },

    async deleteLink(id) {
      await db
        .collection("shor_links")
        .deleteOne({ _id: id as unknown as object });
    },

    async incrementLinkClicks(id) {
      await db
        .collection("shor_links")
        .updateOne({ _id: id as unknown as object }, { $inc: { clicks: 1 } });
    },

    async readNotes(): Promise<Note[]> {
      const docs = await db
        .collection("shor_notes")
        .find()
        .sort({ updatedAt: -1 })
        .toArray();
      return docs.map((d) => ({
        id: String(d._id),
        title: d.title as string,
        content: d.content as string,
        createdAt: d.createdAt as string,
        updatedAt: d.updatedAt as string,
      }));
    },

    async writeNote(id, note) {
      await db
        .collection("shor_notes")
        .replaceOne(
          { _id: id as unknown as object },
          { _id: id as unknown as object, ...note },
          { upsert: true },
        );
    },

    async deleteNote(id) {
      await db
        .collection("shor_notes")
        .deleteOne({ _id: id as unknown as object });
    },

    async ping() {
      await db.command({ ping: 1 });
    },

    async close() {
      await client.close();
    },
  };
}

// ── PostgreSQL adapter ────────────────────────────────────────────────────────

async function pgAdapter(connectionString: string): Promise<DataAdapter> {
  const pg = await import("pg").catch(() => {
    throw new Error("PostgreSQL driver not installed. Run: npm install pg");
  });
  // Handle both ESM default export and CJS named export
  const Pool: typeof import("pg").Pool =
    (pg as unknown as { default?: { Pool: typeof import("pg").Pool } }).default
      ?.Pool ?? pg.Pool;

  const pool = new Pool({ connectionString });

  // Bootstrap schema on first connect
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shor_links (
      id          TEXT        PRIMARY KEY,
      original_url TEXT       NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clicks      INTEGER     NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS shor_notes (
      id         TEXT        PRIMARY KEY,
      title      TEXT        NOT NULL DEFAULT '',
      content    TEXT        NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  function toIso(v: unknown): string {
    return v instanceof Date ? v.toISOString() : String(v);
  }

  return {
    async readLinks(): Promise<LinksMap> {
      const { rows } = await pool.query(
        "SELECT id, original_url, created_at, clicks FROM shor_links",
      );
      const map: LinksMap = {};
      for (const r of rows) {
        map[r.id] = {
          originalUrl: r.original_url,
          createdAt: toIso(r.created_at),
          clicks: r.clicks,
        };
      }
      return map;
    },

    async writeLink(id, entry) {
      await pool.query(
        `INSERT INTO shor_links (id, original_url, created_at, clicks)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE
           SET original_url=$2, created_at=$3, clicks=$4`,
        [id, entry.originalUrl, entry.createdAt, entry.clicks],
      );
    },

    async deleteLink(id) {
      await pool.query("DELETE FROM shor_links WHERE id=$1", [id]);
    },

    async incrementLinkClicks(id) {
      await pool.query(
        "UPDATE shor_links SET clicks = clicks + 1 WHERE id=$1",
        [id],
      );
    },

    async readNotes(): Promise<Note[]> {
      const { rows } = await pool.query(
        "SELECT id, title, content, created_at, updated_at FROM shor_notes ORDER BY updated_at DESC",
      );
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    },

    async writeNote(id, note) {
      await pool.query(
        `INSERT INTO shor_notes (id, title, content, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE
           SET title=$2, content=$3, created_at=$4, updated_at=$5`,
        [id, note.title, note.content, note.createdAt, note.updatedAt],
      );
    },

    async deleteNote(id) {
      await pool.query("DELETE FROM shor_notes WHERE id=$1", [id]);
    },

    async ping() {
      await pool.query("SELECT 1");
    },

    async close() {
      await pool.end();
    },
  };
}
