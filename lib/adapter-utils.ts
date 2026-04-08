import { getActiveAdapter } from "./db-adapter";
import type { LinkEntry, StoredLink } from "./link-types";

export async function getLink(id: string): Promise<LinkEntry | null> {
  return (await getActiveAdapter()).getLinkById(id);
}

export async function listLinksByUserId(userId: string): Promise<StoredLink[]> {
  return (await getActiveAdapter()).readLinksByUserId(userId);
}

export async function setLink(id: string, entry: LinkEntry): Promise<void> {
  await (await getActiveAdapter()).writeLink(id, entry);
}

export async function removeLink(id: string): Promise<void> {
  await (await getActiveAdapter()).deleteLink(id);
}

export async function clickLink(id: string): Promise<void> {
  await (await getActiveAdapter()).incrementLinkClicks(id);
}
