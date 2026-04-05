import type { BioLink, BioProfile } from "./account-types";
import {
  ensureBioProfileForUser,
  getBioProfileByUsername,
  listBioLinks,
} from "./account-data";
import { buildBioPageData, type BioPage } from "./bio-shared";

export type { BioPage } from "./bio-shared";

export async function getBioPageByUsername(
  username: string,
): Promise<BioPage | null> {
  const profile = await getBioProfileByUsername(username);
  if (!profile) return null;

  const links = await listBioLinks(profile.userId);
  return buildBioPageData(profile, links);
}

export async function getBioPageForUser(
  userId: string,
): Promise<BioPage | null> {
  const profile = await ensureBioProfileForUser(userId);
  if (!profile) return null;

  const links = await listBioLinks(profile.userId);
  return buildBioPageData(profile, links);
}
