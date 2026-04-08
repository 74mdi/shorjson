import { getLink } from "./adapter-utils";
import type { LinkEntry } from "./link-types";

export interface ResolvedLink extends LinkEntry {
  shortId: string;
}

export async function getLinkBySlug(slug: string): Promise<ResolvedLink | null> {
  const entry = await getLink(slug);

  return entry ? { shortId: slug, ...entry } : null;
}

export function getLinkDestinationLabel(originalUrl: string): string | null {
  try {
    return new URL(originalUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
