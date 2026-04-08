export interface LinkEntry {
  originalUrl: string;
  createdAt: string;
  clicks: number;
  passwordHash?: string;
  passwordSalt?: string;
  userId?: string;
  clickLimit?: number | null;
  expiresAt?: string | null;
}

export type LinksMap = Record<string, LinkEntry>;

export interface StoredLink extends LinkEntry {
  shortId: string;
}
