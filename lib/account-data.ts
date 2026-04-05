import { getActiveAdapter } from "./db-adapter";
import {
  readBioLinksFile,
  readPrivateNotesFile,
  readUsersFile,
  writeBioLinksFile,
  writePrivateNotesFile,
  writeUsersFile,
} from "./account-file-storage";
import type { AccountUser, BioLink, PrivateNote } from "./account-types";

function normalisePrivateNote(note: PrivateNote | Record<string, unknown>): PrivateNote {
  return {
    id: String(note.id ?? ""),
    userId: String(note.userId ?? ""),
    title: typeof note.title === "string" ? note.title : "",
    content: typeof note.content === "string" ? note.content : "",
    createdAt: String(note.createdAt ?? new Date().toISOString()),
    updatedAt: String(note.updatedAt ?? note.createdAt ?? new Date().toISOString()),
  };
}

function sortBioLinks(items: BioLink[]): BioLink[] {
  return [...items].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

function sortPrivateNotes(items: PrivateNote[]): PrivateNote[] {
  return [...items].sort((left, right) => {
    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export async function getUserById(userId: string): Promise<AccountUser | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getAccountUserById(userId);
  }

  return readUsersFile()[userId] ?? null;
}

export async function getUserByUsername(
  username: string,
): Promise<AccountUser | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getAccountUserByUsername(username);
  }

  return (
    Object.values(readUsersFile()).find((user) => user.username === username) ??
    null
  );
}

export async function createUser(user: AccountUser): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.createAccountUser(user);
    return;
  }

  const users = readUsersFile();
  users[user.id] = user;
  writeUsersFile(users);
}

export async function listBioLinks(userId: string): Promise<BioLink[]> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.readBioLinks(userId);
  }

  return sortBioLinks(
    Object.values(readBioLinksFile()).filter((link) => link.userId === userId),
  );
}

export async function getBioLinkById(
  userId: string,
  id: string,
): Promise<BioLink | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getBioLinkById(userId, id);
  }

  const link = readBioLinksFile()[id];
  if (!link || link.userId !== userId) return null;
  return link;
}

export async function saveBioLink(link: BioLink): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.writeBioLink(link);
    return;
  }

  const links = readBioLinksFile();
  links[link.id] = link;
  writeBioLinksFile(links);
}

export async function deleteBioLink(
  userId: string,
  id: string,
): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.deleteBioLink(userId, id);
    return;
  }

  const links = readBioLinksFile();
  if (links[id]?.userId === userId) {
    delete links[id];
    writeBioLinksFile(links);
  }
}

export async function listPrivateNotes(userId: string): Promise<PrivateNote[]> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.readPrivateNotes(userId);
  }

  return sortPrivateNotes(
    Object.values(readPrivateNotesFile())
      .map((note) => normalisePrivateNote(note))
      .filter((note) => note.userId === userId),
  );
}

export async function getPrivateNoteById(
  userId: string,
  id: string,
): Promise<PrivateNote | null> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    return adapter.getPrivateNoteById(userId, id);
  }

  const note = readPrivateNotesFile()[id];
  if (!note || note.userId !== userId) return null;
  return normalisePrivateNote(note);
}

export async function savePrivateNote(note: PrivateNote): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.writePrivateNote(note);
    return;
  }

  const notes = readPrivateNotesFile();
  notes[note.id] = note;
  writePrivateNotesFile(notes);
}

export async function deletePrivateNote(
  userId: string,
  id: string,
): Promise<void> {
  const adapter = await getActiveAdapter().catch(() => null);
  if (adapter) {
    await adapter.deletePrivateNote(userId, id);
    return;
  }

  const notes = readPrivateNotesFile();
  if (notes[id]?.userId === userId) {
    delete notes[id];
    writePrivateNotesFile(notes);
  }
}
