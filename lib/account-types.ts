import { randomUUID } from "crypto";
import type { ButtonStyle } from "./bio-shared";

export type { ButtonStyle } from "./bio-shared";
export { isButtonStyle } from "./bio-shared";

export interface AccountUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface BioProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  buttonStyle: ButtonStyle;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface BioLink {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  url: string;
  icon: string;
  section: string;
  visible: boolean;
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
