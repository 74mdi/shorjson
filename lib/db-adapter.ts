import type { AccountUser, BioLink, BioProfile, PrivateNote } from "./account-types";
import type { LinkEntry, LinksMap, StoredLink } from "./link-types";

export interface DataAdapter {
  readLinks(): Promise<LinksMap>;
  readLinksByUserId(userId: string): Promise<StoredLink[]>;
  getLinkById(id: string): Promise<LinkEntry | null>;
  writeLink(id: string, entry: LinkEntry): Promise<void>;
  deleteLink(id: string): Promise<void>;
  incrementLinkClicks(id: string): Promise<void>;

  getAccountUserById(userId: string): Promise<AccountUser | null>;
  getAccountUserByUsername(username: string): Promise<AccountUser | null>;
  createAccountUser(user: AccountUser): Promise<void>;
  updateAccountUser(user: AccountUser): Promise<void>;

  getBioProfileByUserId(userId: string): Promise<BioProfile | null>;
  getBioProfileByUsername(username: string): Promise<BioProfile | null>;
  writeBioProfile(profile: BioProfile): Promise<void>;

  readBioLinks(userId: string): Promise<BioLink[]>;
  getBioLinkById(userId: string, id: string): Promise<BioLink | null>;
  writeBioLink(link: BioLink): Promise<void>;
  deleteBioLink(userId: string, id: string): Promise<void>;

  readPrivateNotes(userId: string): Promise<PrivateNote[]>;
  getPrivateNoteById(userId: string, id: string): Promise<PrivateNote | null>;
  getPrivateNoteBySlug(slug: string): Promise<PrivateNote | null>;
  writePrivateNote(note: PrivateNote): Promise<void>;
  deletePrivateNote(userId: string, id: string): Promise<void>;

  close(): Promise<void>;
}

const g = globalThis as {
  _kokiAdapter?: Promise<DataAdapter>;
  _kokiAdapterKey?: string;
};

export async function getActiveAdapter(): Promise<DataAdapter> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set it to your Neon PostgreSQL connection string.",
    );
  }

  if (!g._kokiAdapter || g._kokiAdapterKey !== connectionString) {
    g._kokiAdapterKey = connectionString;
    g._kokiAdapter = createPostgresAdapter(connectionString).catch((error) => {
      g._kokiAdapter = undefined;
      g._kokiAdapterKey = undefined;
      throw error;
    });
  }

  return g._kokiAdapter;
}

function shouldUseSsl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return !["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapLinkRow(row: Record<string, unknown>): LinkEntry {
  return {
    originalUrl: String(row.original_url ?? ""),
    createdAt: toIso(row.created_at ?? new Date().toISOString()),
    clicks: Number(row.clicks ?? 0),
    ...(typeof row.user_id === "string" ? { userId: row.user_id } : {}),
    ...(typeof row.click_limit === "number"
      ? { clickLimit: row.click_limit }
      : row.click_limit === null
        ? { clickLimit: null }
        : {}),
    ...(typeof row.expires_at === "string" || row.expires_at instanceof Date
      ? { expiresAt: toIso(row.expires_at) }
      : row.expires_at === null
        ? { expiresAt: null }
        : {}),
    ...(typeof row.password_hash === "string"
      ? { passwordHash: row.password_hash }
      : {}),
    ...(typeof row.password_salt === "string"
      ? { passwordSalt: row.password_salt }
      : {}),
  };
}

function mapStoredLinkRow(row: Record<string, unknown>): StoredLink {
  return {
    shortId: String(row.id ?? ""),
    ...mapLinkRow(row),
  };
}

async function createPostgresAdapter(connectionString: string): Promise<DataAdapter> {
  const pg = await import("pg").catch(() => {
    throw new Error("PostgreSQL driver not installed. Run: npm install pg");
  });
  const Pool: typeof import("pg").Pool =
    (pg as unknown as { default?: { Pool: typeof import("pg").Pool } }).default
      ?.Pool ?? pg.Pool;

  const pool = new Pool({
    connectionString,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    ssl: shouldUseSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shor_users (
      id            TEXT        PRIMARY KEY,
      username      TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_links (
      id            TEXT        PRIMARY KEY,
      original_url  TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clicks        INTEGER     NOT NULL DEFAULT 0,
      user_id       TEXT,
      click_limit   INTEGER,
      expires_at    TIMESTAMPTZ,
      password_hash TEXT,
      password_salt TEXT
    );
    CREATE TABLE IF NOT EXISTS shor_bio_profiles (
      id                 TEXT        PRIMARY KEY,
      user_id            TEXT        NOT NULL UNIQUE REFERENCES shor_users(id) ON DELETE CASCADE,
      username           TEXT        NOT NULL UNIQUE,
      display_name       TEXT        NOT NULL DEFAULT '',
      bio                TEXT        NOT NULL DEFAULT '',
      avatar             TEXT,
      button_style       TEXT        NOT NULL DEFAULT 'minimal',
      button_size        TEXT        NOT NULL DEFAULT 'balanced',
      accent_color       TEXT        NOT NULL DEFAULT '#d97b4a',
      theme_preset       TEXT        NOT NULL DEFAULT 'mono',
      font_preset        TEXT        NOT NULL DEFAULT 'sans',
      animation_preset   TEXT        NOT NULL DEFAULT 'morph',
      background_style   TEXT        NOT NULL DEFAULT 'plain',
      button_blur        TEXT        NOT NULL DEFAULT 'soft',
      page_width         TEXT        NOT NULL DEFAULT 'standard',
      button_label_style TEXT        NOT NULL DEFAULT 'normal',
      watermark_text     TEXT        NOT NULL DEFAULT 'made with koki',
      show_theme_toggle  BOOLEAN     NOT NULL DEFAULT false,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_user_links (
      id            TEXT        PRIMARY KEY,
      user_id       TEXT        NOT NULL REFERENCES shor_users(id) ON DELETE CASCADE,
      profile_id    TEXT,
      title         TEXT        NOT NULL,
      url           TEXT        NOT NULL,
      icon          TEXT        NOT NULL DEFAULT '🔗',
      icon_color    TEXT        NOT NULL DEFAULT '#1c1916',
      section_label TEXT        NOT NULL DEFAULT 'main',
      visible       BOOLEAN     NOT NULL DEFAULT true,
      order_index   INTEGER     NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shor_user_notes (
      id            TEXT        PRIMARY KEY,
      user_id       TEXT        NOT NULL REFERENCES shor_users(id) ON DELETE CASCADE,
      title         TEXT        NOT NULL DEFAULT '',
      content       TEXT        NOT NULL DEFAULT '',
      is_public     BOOLEAN,
      slug          TEXT UNIQUE,
      password_hash TEXT,
      password_salt TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS click_limit INTEGER;
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE shor_links
      ADD COLUMN IF NOT EXISTS password_salt TEXT;
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN;
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE shor_user_notes
      ADD COLUMN IF NOT EXISTS password_salt TEXT;
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS profile_id TEXT;
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🔗';
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS section_label TEXT NOT NULL DEFAULT 'main';
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE shor_user_links
      ADD COLUMN IF NOT EXISTS icon_color TEXT NOT NULL DEFAULT '#1c1916';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS button_size TEXT NOT NULL DEFAULT 'balanced';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS theme_preset TEXT NOT NULL DEFAULT 'mono';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS font_preset TEXT NOT NULL DEFAULT 'sans';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS animation_preset TEXT NOT NULL DEFAULT 'morph';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS background_style TEXT NOT NULL DEFAULT 'plain';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS button_blur TEXT NOT NULL DEFAULT 'soft';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS page_width TEXT NOT NULL DEFAULT 'standard';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS button_label_style TEXT NOT NULL DEFAULT 'normal';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS watermark_text TEXT NOT NULL DEFAULT 'made with koki';
    ALTER TABLE shor_bio_profiles
      ADD COLUMN IF NOT EXISTS show_theme_toggle BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS shor_links_user_created_idx
      ON shor_links (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS shor_links_user_original_url_idx
      ON shor_links (user_id, original_url);
    CREATE INDEX IF NOT EXISTS shor_bio_profiles_username_idx
      ON shor_bio_profiles (username);
    CREATE INDEX IF NOT EXISTS shor_user_links_user_order_idx
      ON shor_user_links (user_id, order_index, created_at);
    CREATE INDEX IF NOT EXISTS shor_user_notes_user_updated_idx
      ON shor_user_notes (user_id, updated_at DESC);
  `);

  return {
    async readLinks(): Promise<LinksMap> {
      const { rows } = await pool.query(
        `SELECT id, original_url, created_at, clicks, user_id, click_limit, expires_at, password_hash, password_salt
         FROM shor_links`,
      );
      const map: LinksMap = {};
      for (const row of rows as Record<string, unknown>[]) {
        map[String(row.id)] = mapLinkRow(row);
      }
      return map;
    },

    async readLinksByUserId(userId) {
      const { rows } = await pool.query(
        `SELECT id, original_url, created_at, clicks, user_id, click_limit, expires_at, password_hash, password_salt
         FROM shor_links
         WHERE user_id=$1
         ORDER BY created_at DESC`,
        [userId],
      );
      return (rows as Record<string, unknown>[]).map(mapStoredLinkRow);
    },

    async getLinkById(id) {
      const { rows } = await pool.query(
        `SELECT id, original_url, created_at, clicks, user_id, click_limit, expires_at, password_hash, password_salt
         FROM shor_links
         WHERE id=$1`,
        [id],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      return row ? mapLinkRow(row) : null;
    },

    async writeLink(id, entry) {
      await pool.query(
        `INSERT INTO shor_links (
           id, original_url, created_at, clicks, user_id, click_limit, expires_at, password_hash, password_salt
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE
           SET original_url=$2,
               created_at=$3,
               clicks=$4,
               user_id=$5,
               click_limit=$6,
               expires_at=$7,
               password_hash=$8,
               password_salt=$9`,
        [
          id,
          entry.originalUrl,
          entry.createdAt,
          entry.clicks,
          entry.userId ?? null,
          entry.clickLimit ?? null,
          entry.expiresAt ?? null,
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

    async getAccountUserById(userId) {
      const { rows } = await pool.query(
        `SELECT id, username, password_hash, created_at, updated_at
         FROM shor_users
         WHERE id=$1`,
        [userId],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        username: String(row.username),
        passwordHash: String(row.password_hash),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async getAccountUserByUsername(username) {
      const { rows } = await pool.query(
        `SELECT id, username, password_hash, created_at, updated_at
         FROM shor_users
         WHERE username=$1`,
        [username.toLowerCase()],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        username: String(row.username),
        passwordHash: String(row.password_hash),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async createAccountUser(user) {
      await pool.query(
        `INSERT INTO shor_users (id, username, password_hash, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          user.id,
          user.username.toLowerCase(),
          user.passwordHash,
          user.createdAt,
          user.updatedAt,
        ],
      );
    },

    async updateAccountUser(user) {
      await pool.query(
        `UPDATE shor_users
         SET username=$2, password_hash=$3, created_at=$4, updated_at=$5
         WHERE id=$1`,
        [
          user.id,
          user.username.toLowerCase(),
          user.passwordHash,
          user.createdAt,
          user.updatedAt,
        ],
      );
    },

    async getBioProfileByUserId(userId) {
      const { rows } = await pool.query(
        `SELECT id, user_id, username, display_name, bio, avatar, button_style, button_size, accent_color, theme_preset, font_preset, animation_preset, background_style, button_blur, page_width, button_label_style, watermark_text, show_theme_toggle, created_at, updated_at
         FROM shor_bio_profiles
         WHERE user_id=$1`,
        [userId],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        username: String(row.username),
        displayName: String(row.display_name ?? ""),
        bio: String(row.bio ?? ""),
        avatar: typeof row.avatar === "string" ? row.avatar : null,
        buttonStyle: String(row.button_style) as BioProfile["buttonStyle"],
        buttonSize: String(row.button_size ?? "balanced") as BioProfile["buttonSize"],
        accentColor: String(row.accent_color),
        themePreset: String(row.theme_preset) as BioProfile["themePreset"],
        fontPreset: String(row.font_preset) as BioProfile["fontPreset"],
        animationPreset: String(row.animation_preset) as BioProfile["animationPreset"],
        backgroundStyle: String(row.background_style ?? "plain") as BioProfile["backgroundStyle"],
        buttonBlur: String(row.button_blur ?? "soft") as BioProfile["buttonBlur"],
        pageWidth: String(row.page_width ?? "standard") as BioProfile["pageWidth"],
        buttonLabelStyle: String(row.button_label_style ?? "normal") as BioProfile["buttonLabelStyle"],
        watermarkText: String(row.watermark_text ?? "made with koki"),
        showThemeToggle: Boolean(row.show_theme_toggle ?? false),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async getBioProfileByUsername(username) {
      const { rows } = await pool.query(
        `SELECT id, user_id, username, display_name, bio, avatar, button_style, button_size, accent_color, theme_preset, font_preset, animation_preset, background_style, button_blur, page_width, button_label_style, watermark_text, show_theme_toggle, created_at, updated_at
         FROM shor_bio_profiles
         WHERE username=$1`,
        [username.toLowerCase()],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        username: String(row.username),
        displayName: String(row.display_name ?? ""),
        bio: String(row.bio ?? ""),
        avatar: typeof row.avatar === "string" ? row.avatar : null,
        buttonStyle: String(row.button_style) as BioProfile["buttonStyle"],
        buttonSize: String(row.button_size ?? "balanced") as BioProfile["buttonSize"],
        accentColor: String(row.accent_color),
        themePreset: String(row.theme_preset) as BioProfile["themePreset"],
        fontPreset: String(row.font_preset) as BioProfile["fontPreset"],
        animationPreset: String(row.animation_preset) as BioProfile["animationPreset"],
        backgroundStyle: String(row.background_style ?? "plain") as BioProfile["backgroundStyle"],
        buttonBlur: String(row.button_blur ?? "soft") as BioProfile["buttonBlur"],
        pageWidth: String(row.page_width ?? "standard") as BioProfile["pageWidth"],
        buttonLabelStyle: String(row.button_label_style ?? "normal") as BioProfile["buttonLabelStyle"],
        watermarkText: String(row.watermark_text ?? "made with koki"),
        showThemeToggle: Boolean(row.show_theme_toggle ?? false),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async writeBioProfile(profile) {
      await pool.query(
        `INSERT INTO shor_bio_profiles (
           id, user_id, username, display_name, bio, avatar, button_style, button_size, accent_color, theme_preset, font_preset, animation_preset, background_style, button_blur, page_width, button_label_style, watermark_text, show_theme_toggle, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2,
               username=$3,
               display_name=$4,
               bio=$5,
               avatar=$6,
               button_style=$7,
               button_size=$8,
               accent_color=$9,
               theme_preset=$10,
               font_preset=$11,
               animation_preset=$12,
               background_style=$13,
               button_blur=$14,
               page_width=$15,
               button_label_style=$16,
               watermark_text=$17,
               show_theme_toggle=$18,
               created_at=$19,
               updated_at=$20`,
        [
          profile.id,
          profile.userId,
          profile.username.toLowerCase(),
          profile.displayName,
          profile.bio,
          profile.avatar,
          profile.buttonStyle,
          profile.buttonSize,
          profile.accentColor,
          profile.themePreset,
          profile.fontPreset,
          profile.animationPreset,
          profile.backgroundStyle,
          profile.buttonBlur,
          profile.pageWidth,
          profile.buttonLabelStyle,
          profile.watermarkText,
          profile.showThemeToggle,
          profile.createdAt,
          profile.updatedAt,
        ],
      );
    },

    async readBioLinks(userId) {
      const { rows } = await pool.query(
        `SELECT id, user_id, profile_id, title, url, icon, icon_color, section_label, visible, order_index, created_at
         FROM shor_user_links
         WHERE user_id=$1
         ORDER BY order_index ASC, created_at ASC`,
        [userId],
      );

      return (rows as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        profileId: String(row.profile_id ?? ""),
        title: String(row.title ?? ""),
        url: String(row.url ?? ""),
        icon: String(row.icon ?? "🔗"),
        iconColor: String(row.icon_color ?? "#1c1916"),
        section: String(row.section_label ?? "main"),
        visible: Boolean(row.visible ?? true),
        order: Number(row.order_index ?? 0),
        createdAt: toIso(row.created_at),
      }));
    },

    async getBioLinkById(userId, id) {
      const { rows } = await pool.query(
        `SELECT id, user_id, profile_id, title, url, icon, icon_color, section_label, visible, order_index, created_at
         FROM shor_user_links
         WHERE user_id=$1 AND id=$2`,
        [userId, id],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        profileId: String(row.profile_id ?? ""),
        title: String(row.title ?? ""),
        url: String(row.url ?? ""),
        icon: String(row.icon ?? "🔗"),
        iconColor: String(row.icon_color ?? "#1c1916"),
        section: String(row.section_label ?? "main"),
        visible: Boolean(row.visible ?? true),
        order: Number(row.order_index ?? 0),
        createdAt: toIso(row.created_at),
      };
    },

    async writeBioLink(link) {
      await pool.query(
        `INSERT INTO shor_user_links (
           id, user_id, profile_id, title, url, icon, icon_color, section_label, visible, order_index, created_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2,
               profile_id=$3,
               title=$4,
               url=$5,
               icon=$6,
               icon_color=$7,
               section_label=$8,
               visible=$9,
               order_index=$10,
               created_at=$11`,
        [
          link.id,
          link.userId,
          link.profileId,
          link.title,
          link.url,
          link.icon,
          link.iconColor,
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
        `SELECT id, user_id, title, content, is_public, slug, password_hash, password_salt, created_at, updated_at
         FROM shor_user_notes
         WHERE user_id=$1
         ORDER BY updated_at DESC`,
        [userId],
      );

      return (rows as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title ?? ""),
        content: String(row.content ?? ""),
        isPublic: row.is_public ? true : undefined,
        slug: row.slug ? String(row.slug) : undefined,
        passwordHash: row.password_hash ? String(row.password_hash) : undefined,
        passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      }));
    },

    async getPrivateNoteById(userId, id) {
      const { rows } = await pool.query(
        `SELECT id, user_id, title, content, is_public, slug, password_hash, password_salt, created_at, updated_at
         FROM shor_user_notes
         WHERE user_id=$1 AND id=$2`,
        [userId, id],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title ?? ""),
        content: String(row.content ?? ""),
        isPublic: row.is_public ? true : undefined,
        slug: row.slug ? String(row.slug) : undefined,
        passwordHash: row.password_hash ? String(row.password_hash) : undefined,
        passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async getPrivateNoteBySlug(slug) {
      const { rows } = await pool.query(
        `SELECT id, user_id, title, content, is_public, slug, password_hash, password_salt, created_at, updated_at
         FROM shor_user_notes
         WHERE slug=$1`,
        [slug],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title ?? ""),
        content: String(row.content ?? ""),
        isPublic: row.is_public ? true : undefined,
        slug: row.slug ? String(row.slug) : undefined,
        passwordHash: row.password_hash ? String(row.password_hash) : undefined,
        passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    },

    async writePrivateNote(note) {
      await pool.query(
        `INSERT INTO shor_user_notes (
           id, user_id, title, content, is_public, slug, password_hash, password_salt, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE
           SET user_id=$2,
               title=$3,
               content=$4,
               is_public=$5,
               slug=$6,
               password_hash=$7,
               password_salt=$8,
               created_at=$9,
               updated_at=$10`,
        [
          note.id,
          note.userId,
          note.title,
          note.content,
          note.isPublic ?? null,
          note.slug ?? null,
          note.passwordHash ?? null,
          note.passwordSalt ?? null,
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

    async close() {
      await pool.end();
    },
  };
}
