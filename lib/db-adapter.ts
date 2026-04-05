// lib/db-adapter.ts
// Database adapter interface + MongoDB and PostgreSQL implementations.
// All adapters expose the same async interface so routes stay adapter-agnostic.

import type { LinksMap, LinkEntry } from "./storage";
import type { Note } from "./notes-storage";
import type {
  AccountUser,
  BioLink,
  BioProfile,
  PrivateNote,
} from "./account-types";
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

  getAccountUserById(userId: string): Promise<AccountUser | null>;
  getAccountUserByUsername(username: string): Promise<AccountUser | null>;
  createAccountUser(user: AccountUser): Promise<void>;

  getBioProfileByUserId(userId: string): Promise<BioProfile | null>;
  getBioProfileByUsername(username: string): Promise<BioProfile | null>;
  writeBioProfile(profile: BioProfile): Promise<void>;

  readBioLinks(userId: string): Promise<BioLink[]>;
  getBioLinkById(userId: string, id: string): Promise<BioLink | null>;
  writeBioLink(link: BioLink): Promise<void>;
  deleteBioLink(userId: string, id: string): Promise<void>;

  readPrivateNotes(userId: string): Promise<PrivateNote[]>;
  getPrivateNoteById(userId: string, id: string): Promise<PrivateNote | null>;
  writePrivateNote(note: PrivateNote): Promise<void>;
  deletePrivateNote(userId: string, id: string): Promise<void>;

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

  await db
    .collection("shor_users")
    .createIndex({ username: 1 }, { unique: true })
    .catch(() => {});
  await db
    .collection("shor_bio_profiles")
    .createIndex({ userId: 1 }, { unique: true })
    .catch(() => {});
  await db
    .collection("shor_bio_profiles")
    .createIndex({ username: 1 }, { unique: true })
    .catch(() => {});
  await db
    .collection("shor_user_links")
    .createIndex({ userId: 1, order: 1, createdAt: 1 })
    .catch(() => {});
  await db
    .collection("shor_user_notes")
    .createIndex({ userId: 1, updatedAt: -1, createdAt: -1 })
    .catch(() => {});

  const usersCollection = db.collection("shor_users") as {
    deleteOne: (query: unknown) => Promise<unknown>;
    findOne: (query: unknown) => Promise<Record<string, unknown> | null>;
    insertOne: (doc: unknown) => Promise<unknown>;
  };
  const bioProfilesCollection = db.collection("shor_bio_profiles") as {
    findOne: (query: unknown) => Promise<Record<string, unknown> | null>;
    replaceOne: (
      query: unknown,
      doc: unknown,
      options: { upsert: boolean },
    ) => Promise<unknown>;
  };
  const userLinksCollection = db.collection("shor_user_links") as {
    deleteOne: (query: unknown) => Promise<unknown>;
    find: (query: unknown) => { sort: (sort: unknown) => { toArray: () => Promise<Record<string, unknown>[]> } };
    findOne: (query: unknown) => Promise<Record<string, unknown> | null>;
    replaceOne: (
      query: unknown,
      doc: unknown,
      options: { upsert: boolean },
    ) => Promise<unknown>;
  };
  const userNotesCollection = db.collection("shor_user_notes") as {
    deleteOne: (query: unknown) => Promise<unknown>;
    find: (query: unknown) => { sort: (sort: unknown) => { toArray: () => Promise<Record<string, unknown>[]> } };
    findOne: (query: unknown) => Promise<Record<string, unknown> | null>;
    replaceOne: (
      query: unknown,
      doc: unknown,
      options: { upsert: boolean },
    ) => Promise<unknown>;
  };

  return {
    async readLinks(): Promise<LinksMap> {
      const docs = await db.collection("shor_links").find().toArray();
      const map: LinksMap = {};
      for (const doc of docs) {
        map[String(doc._id)] = {
          originalUrl: doc.originalUrl as string,
          createdAt: doc.createdAt as string,
          clicks: (doc.clicks as number) ?? 0,
          ...(typeof doc.passwordHash === "string"
            ? { passwordHash: doc.passwordHash as string }
            : {}),
          ...(typeof doc.passwordSalt === "string"
            ? { passwordSalt: doc.passwordSalt as string }
            : {}),
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

    async getAccountUserById(userId) {
      const user = await usersCollection.findOne({ _id: userId });
      if (!user) return null;

      return {
        id: String(user._id),
        username: String(user.username),
        passwordHash: String(user.passwordHash),
        createdAt: String(user.createdAt),
        updatedAt: String(user.updatedAt),
      };
    },

    async getAccountUserByUsername(username) {
      const user = await usersCollection.findOne({ username });
      if (!user) return null;

      return {
        id: String(user._id),
        username: String(user.username),
        passwordHash: String(user.passwordHash),
        createdAt: String(user.createdAt),
        updatedAt: String(user.updatedAt),
      };
    },

    async createAccountUser(user) {
      await usersCollection.insertOne({
        _id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    },

    async getBioProfileByUserId(userId) {
      const profile = await bioProfilesCollection.findOne({ userId });
      if (!profile) return null;

      return {
        id: String(profile._id),
        userId: String(profile.userId),
        username: String(profile.username),
        displayName: String(profile.displayName ?? ""),
        bio: String(profile.bio ?? ""),
        avatar:
          typeof profile.avatar === "string" ? String(profile.avatar) : null,
        buttonStyle: String(profile.buttonStyle ?? "minimal") as BioProfile["buttonStyle"],
        accentColor: String(profile.accentColor ?? "#d97b4a"),
        createdAt: String(profile.createdAt),
        updatedAt: String(profile.updatedAt),
      };
    },

    async getBioProfileByUsername(username) {
      const profile = await bioProfilesCollection.findOne({
        username: username.toLowerCase(),
      });
      if (!profile) return null;

      return {
        id: String(profile._id),
        userId: String(profile.userId),
        username: String(profile.username),
        displayName: String(profile.displayName ?? ""),
        bio: String(profile.bio ?? ""),
        avatar:
          typeof profile.avatar === "string" ? String(profile.avatar) : null,
        buttonStyle: String(profile.buttonStyle ?? "minimal") as BioProfile["buttonStyle"],
        accentColor: String(profile.accentColor ?? "#d97b4a"),
        createdAt: String(profile.createdAt),
        updatedAt: String(profile.updatedAt),
      };
    },

    async writeBioProfile(profile) {
      await bioProfilesCollection.replaceOne(
        { _id: profile.id, userId: profile.userId },
        { _id: profile.id, ...profile, username: profile.username.toLowerCase() },
        { upsert: true },
      );
    },

    async readBioLinks(userId) {
      const docs = await db
        .collection("shor_user_links")
        .find({ userId })
        .sort({ order: 1, createdAt: 1 })
        .toArray();

      return docs.map((doc) => ({
        id: String(doc._id),
        userId: String(doc.userId),
        profileId: String(doc.profileId ?? ""),
        title: String(doc.title),
        url: String(doc.url),
        icon: String(doc.icon ?? "🔗"),
        section: String(doc.section ?? "main"),
        visible: Boolean(doc.visible ?? true),
        order: Number(doc.order) || 0,
        createdAt: String(doc.createdAt),
      }));
    },

    async getBioLinkById(userId, id) {
      const doc = await userLinksCollection.findOne({ _id: id, userId });
      if (!doc) return null;

      return {
        id: String(doc._id),
        userId: String(doc.userId),
        profileId: String(doc.profileId ?? ""),
        title: String(doc.title),
        url: String(doc.url),
        icon: String(doc.icon ?? "🔗"),
        section: String(doc.section ?? "main"),
        visible: Boolean(doc.visible ?? true),
        order: Number(doc.order) || 0,
        createdAt: String(doc.createdAt),
      };
    },

    async writeBioLink(link) {
      await userLinksCollection.replaceOne(
        { _id: link.id, userId: link.userId },
        { _id: link.id, ...link },
        { upsert: true },
      );
    },

    async deleteBioLink(userId, id) {
      await userLinksCollection.deleteOne({ _id: id, userId });
    },

    async readPrivateNotes(userId) {
      const docs = await db
        .collection("shor_user_notes")
        .find({ userId })
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray();

      return docs.map((doc) => ({
        id: String(doc._id),
        userId: String(doc.userId),
        title: String(doc.title ?? ""),
        content: String(doc.content),
        createdAt: String(doc.createdAt),
        updatedAt: String(doc.updatedAt),
      }));
    },

    async getPrivateNoteById(userId, id) {
      const doc = await userNotesCollection.findOne({ _id: id, userId });
      if (!doc) return null;

      return {
        id: String(doc._id),
        userId: String(doc.userId),
        title: String(doc.title ?? ""),
        content: String(doc.content),
        createdAt: String(doc.createdAt),
        updatedAt: String(doc.updatedAt),
      };
    },

    async writePrivateNote(note) {
      await userNotesCollection.replaceOne(
        { _id: note.id, userId: note.userId },
        { _id: note.id, ...note },
        { upsert: true },
      );
    },

    async deletePrivateNote(userId, id) {
      await userNotesCollection.deleteOne({ _id: id, userId });
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
      clicks      INTEGER     NOT NULL DEFAULT 0,
      password_hash TEXT,
      password_salt TEXT
    );
    CREATE TABLE IF NOT EXISTS shor_notes (
      id         TEXT        PRIMARY KEY,
      title      TEXT        NOT NULL DEFAULT '',
      content    TEXT        NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS password_salt TEXT;
    CREATE TABLE IF NOT EXISTS shor_users (
      id            TEXT        PRIMARY KEY,
      username      TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_bio_profiles (
      id           TEXT        PRIMARY KEY,
      user_id      TEXT        NOT NULL UNIQUE REFERENCES shor_users(id) ON DELETE CASCADE,
      username     TEXT        NOT NULL UNIQUE,
      display_name TEXT        NOT NULL DEFAULT '',
      bio          TEXT        NOT NULL DEFAULT '',
      avatar       TEXT,
      button_style TEXT        NOT NULL DEFAULT 'minimal',
      accent_color TEXT        NOT NULL DEFAULT '#d97b4a',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_user_links (
      id          TEXT        PRIMARY KEY,
      user_id     TEXT        NOT NULL REFERENCES shor_users(id) ON DELETE CASCADE,
      profile_id  TEXT,
      title       TEXT        NOT NULL,
      url         TEXT        NOT NULL,
      icon        TEXT        NOT NULL DEFAULT '🔗',
      section_label TEXT      NOT NULL DEFAULT 'main',
      visible     BOOLEAN     NOT NULL DEFAULT true,
      order_index INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_user_notes (
      id          TEXT        PRIMARY KEY,
      user_id     TEXT        NOT NULL REFERENCES shor_users(id) ON DELETE CASCADE,
      title       TEXT        NOT NULL DEFAULT '',
      content     TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS shor_user_links_user_order_idx
      ON shor_user_links (user_id, order_index, created_at);
    CREATE INDEX IF NOT EXISTS shor_bio_profiles_username_idx
      ON shor_bio_profiles (username);
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS profile_id TEXT;
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🔗';
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS section_label TEXT NOT NULL DEFAULT 'main';
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;
    CREATE INDEX IF NOT EXISTS shor_user_notes_user_updated_idx
      ON shor_user_notes (user_id, updated_at DESC);
  `);

  function toIso(v: unknown): string {
    return v instanceof Date ? v.toISOString() : String(v);
  }

  return {
    async readLinks(): Promise<LinksMap> {
      const { rows } = await pool.query(
        "SELECT id, original_url, created_at, clicks, password_hash, password_salt FROM shor_links",
      );
      const map: LinksMap = {};
      for (const r of rows) {
        map[r.id] = {
          originalUrl: r.original_url,
          createdAt: toIso(r.created_at),
          clicks: r.clicks,
          ...(typeof r.password_hash === "string"
            ? { passwordHash: r.password_hash }
            : {}),
          ...(typeof r.password_salt === "string"
            ? { passwordSalt: r.password_salt }
            : {}),
        };
      }
      return map;
    },

    async writeLink(id, entry) {
      await pool.query(
        `INSERT INTO shor_links (id, original_url, created_at, clicks, password_hash, password_salt)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE
           SET original_url=$2, created_at=$3, clicks=$4, password_hash=$5, password_salt=$6`,
        [
          id,
          entry.originalUrl,
          entry.createdAt,
          entry.clicks,
          entry.passwordHash ?? null,
          entry.passwordSalt ?? null,
        ],
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

    async getAccountUserById(userId) {
      const { rows } = await pool.query(
        "SELECT id, username, password_hash, created_at, updated_at FROM shor_users WHERE id=$1",
        [userId],
      );
      const user = rows[0];
      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        passwordHash: user.password_hash,
        createdAt: toIso(user.created_at),
        updatedAt: toIso(user.updated_at),
      };
    },

    async getAccountUserByUsername(username) {
      const { rows } = await pool.query(
        "SELECT id, username, password_hash, created_at, updated_at FROM shor_users WHERE username=$1",
        [username],
      );
      const user = rows[0];
      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        passwordHash: user.password_hash,
        createdAt: toIso(user.created_at),
        updatedAt: toIso(user.updated_at),
      };
    },

    async createAccountUser(user) {
      await pool.query(
        `INSERT INTO shor_users (id, username, password_hash, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          user.id,
          user.username,
          user.passwordHash,
          user.createdAt,
          user.updatedAt,
        ],
      );
    },

    async getBioProfileByUserId(userId) {
      const { rows } = await pool.query(
        `SELECT id, user_id, username, display_name, bio, avatar, button_style, accent_color, created_at, updated_at
         FROM shor_bio_profiles
         WHERE user_id=$1`,
        [userId],
      );
      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        bio: row.bio,
        avatar: row.avatar,
        buttonStyle: row.button_style,
        accentColor: row.accent_color,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async getBioProfileByUsername(username) {
      const { rows } = await pool.query(
        `SELECT id, user_id, username, display_name, bio, avatar, button_style, accent_color, created_at, updated_at
         FROM shor_bio_profiles
         WHERE username=$1`,
        [username.toLowerCase()],
      );
      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        bio: row.bio,
        avatar: row.avatar,
        buttonStyle: row.button_style,
        accentColor: row.accent_color,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async writeBioProfile(profile) {
      await pool.query(
        `INSERT INTO shor_bio_profiles (
           id, user_id, username, display_name, bio, avatar, button_style, accent_color, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2, username=$3, display_name=$4, bio=$5, avatar=$6, button_style=$7, accent_color=$8, created_at=$9, updated_at=$10`,
        [
          profile.id,
          profile.userId,
          profile.username.toLowerCase(),
          profile.displayName,
          profile.bio,
          profile.avatar,
          profile.buttonStyle,
          profile.accentColor,
          profile.createdAt,
          profile.updatedAt,
        ],
      );
    },

    async readBioLinks(userId) {
      const { rows } = await pool.query(
        `SELECT id, user_id, profile_id, title, url, icon, section_label, visible, order_index, created_at
         FROM shor_user_links
         WHERE user_id=$1
         ORDER BY order_index ASC, created_at ASC`,
        [userId],
      );

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        profileId: row.profile_id ?? "",
        title: row.title,
        url: row.url,
        icon: row.icon ?? "🔗",
        section: row.section_label ?? "main",
        visible: row.visible ?? true,
        order: row.order_index,
        createdAt: toIso(row.created_at),
      }));
    },

    async getBioLinkById(userId, id) {
      const { rows } = await pool.query(
        `SELECT id, user_id, profile_id, title, url, icon, section_label, visible, order_index, created_at
         FROM shor_user_links
         WHERE user_id=$1 AND id=$2`,
        [userId, id],
      );
      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        profileId: row.profile_id ?? "",
        title: row.title,
        url: row.url,
        icon: row.icon ?? "🔗",
        section: row.section_label ?? "main",
        visible: row.visible ?? true,
        order: row.order_index,
        createdAt: toIso(row.created_at),
      };
    },

    async writeBioLink(link) {
      await pool.query(
        `INSERT INTO shor_user_links (
           id, user_id, profile_id, title, url, icon, section_label, visible, order_index, created_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2, profile_id=$3, title=$4, url=$5, icon=$6, section_label=$7, visible=$8, order_index=$9, created_at=$10`,
        [
          link.id,
          link.userId,
          link.profileId,
          link.title,
          link.url,
          link.icon,
          link.section,
          link.visible,
          link.order,
          link.createdAt,
        ],
      );
    },

    async deleteBioLink(userId, id) {
      await pool.query(
        "DELETE FROM shor_user_links WHERE user_id=$1 AND id=$2",
        [userId, id],
      );
    },

    async readPrivateNotes(userId) {
      const { rows } = await pool.query(
        `SELECT id, user_id, title, content, created_at, updated_at
         FROM shor_user_notes
         WHERE user_id=$1
         ORDER BY updated_at DESC`,
        [userId],
      );

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title ?? "",
        content: row.content,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      }));
    },

    async getPrivateNoteById(userId, id) {
      const { rows } = await pool.query(
        `SELECT id, user_id, title, content, created_at, updated_at
         FROM shor_user_notes
         WHERE user_id=$1 AND id=$2`,
        [userId, id],
      );
      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        title: row.title ?? "",
        content: row.content,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async writePrivateNote(note) {
      await pool.query(
        `INSERT INTO shor_user_notes (id, user_id, title, content, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2, title=$3, content=$4, created_at=$5, updated_at=$6`,
        [
          note.id,
          note.userId,
          note.title,
          note.content,
          note.createdAt,
          note.updatedAt,
        ],
      );
    },

    async deletePrivateNote(userId, id) {
      await pool.query(
        "DELETE FROM shor_user_notes WHERE user_id=$1 AND id=$2",
        [userId, id],
      );
    },

    async ping() {
      await pool.query("SELECT 1");
    },

    async close() {
      await pool.end();
    },
  };
}
