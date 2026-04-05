import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { LinkEntry } from "./storage";

const scrypt = promisify(scryptCallback);

export const LINK_PASSWORD_MAX = 128;
const PASSWORD_KEY_LENGTH = 64;

export function getOptionalPassword(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() ? value : undefined;
}

export async function hashLinkPassword(password: string): Promise<{
  passwordHash: string;
  passwordSalt: string;
}> {
  const passwordSalt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(
    password,
    passwordSalt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return {
    passwordHash: derived.toString("base64url"),
    passwordSalt,
  };
}

export async function verifyLinkPassword(
  password: string,
  entry: Pick<LinkEntry, "passwordHash" | "passwordSalt">,
): Promise<boolean> {
  if (!entry.passwordHash || !entry.passwordSalt) return false;

  const derived = (await scrypt(
    password,
    entry.passwordSalt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;
  const stored = Buffer.from(entry.passwordHash, "base64url");

  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}

export function isPasswordProtected(
  entry: Pick<LinkEntry, "passwordHash" | "passwordSalt">,
): boolean {
  return Boolean(entry.passwordHash && entry.passwordSalt);
}

export function getUnlockCookieName(slug: string): string {
  return `shor-unlock-${Buffer.from(slug).toString("base64url")}`;
}

function getUnlockCookieValue(
  slug: string,
  entry: Pick<LinkEntry, "passwordHash" | "passwordSalt">,
): string | null {
  if (!isPasswordProtected(entry)) return null;

  return createHash("sha256")
    .update(`${slug}:${entry.passwordSalt}:${entry.passwordHash}`)
    .digest("base64url");
}

export function hasValidUnlockCookie(
  slug: string,
  entry: Pick<LinkEntry, "passwordHash" | "passwordSalt">,
  cookieValue?: string,
): boolean {
  const expected = getUnlockCookieValue(slug, entry);
  if (!expected || !cookieValue) return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(cookieValue);

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createUnlockCookieValue(
  slug: string,
  entry: Pick<LinkEntry, "passwordHash" | "passwordSalt">,
): string {
  const value = getUnlockCookieValue(slug, entry);
  if (!value) {
    throw new Error("Cannot create unlock cookie for an unprotected link.");
  }
  return value;
}
