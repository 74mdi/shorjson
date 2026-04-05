import { getLinks } from "./adapter-utils";
import { getRemoteServerUrl } from "./config";
import type { LinkEntry } from "./storage";

export interface ResolvedLink extends LinkEntry {
  shortId: string;
}

interface RemoteLinkResponse {
  shortId?: string;
  originalUrl?: string;
  createdAt?: string;
  clicks?: number;
  hasPassword?: boolean;
}

export async function getLinkBySlug(slug: string): Promise<ResolvedLink | null> {
  const remoteUrl = getRemoteServerUrl();

  if (remoteUrl) {
    try {
      const res = await fetch(`${remoteUrl}/api/links/${encodeURIComponent(slug)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = (await res.json()) as RemoteLinkResponse;
        if (typeof data.originalUrl === "string" && data.originalUrl) {
          return {
            shortId: data.shortId ?? slug,
            originalUrl: data.originalUrl,
            createdAt:
              typeof data.createdAt === "string"
                ? data.createdAt
                : new Date().toISOString(),
            clicks: typeof data.clicks === "number" ? data.clicks : 0,
            ...(data.hasPassword ? { passwordHash: "__remote_protected__" } : {}),
          };
        }
      }
    } catch {
      // Fall back to local storage below.
    }
  }

  const links = await getLinks();
  const entry = links[slug];

  return entry ? { shortId: slug, ...entry } : null;
}

export function getLinkDestinationLabel(originalUrl: string): string | null {
  try {
    return new URL(originalUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
