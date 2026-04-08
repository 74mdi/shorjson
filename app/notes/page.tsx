import type { Metadata } from "next";
import NotesDashboard from "@/components/NotesDashboard";
import { requirePageSession } from "@/lib/auth";
import { geistMono, instrumentSerif } from "@/lib/fonts";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Notes - koki",
  description: "Private notes workspace inside koki.",
  path: "/notes",
  eyebrow: "Workspace",
  badge: "Private",
});

export default async function NotesPage() {
  const session = await requirePageSession();

  return (
    <div className={`${instrumentSerif.variable} ${geistMono.variable}`}>
      <NotesDashboard
        csrfToken={session.csrfToken}
        username={session.username}
      />
    </div>
  );
}
