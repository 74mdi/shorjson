import { randomUUID } from "crypto";

export interface AccountUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface BioLink {
  id: string;
  userId: string;
  title: string;
  url: string;
  order: number;
  createdAt: string;
}

export interface PrivateNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const SCOPED_ID_SEPARATOR = ".";

export function createScopedResourceId(userId: string): string {
  return `${userId}${SCOPED_ID_SEPARATOR}${randomUUID()}`;
}

export function getScopedResourceOwnerId(id: string): string | null {
  const separatorIndex = id.indexOf(SCOPED_ID_SEPARATOR);
  if (separatorIndex <= 0) return null;
  return id.slice(0, separatorIndex);
}
