import type { Metadata } from "next";
import NotesPageView from "@/components/NotesPage";
import { requirePageSession } from "@/lib/auth";
import { geistMono, instrumentSerif } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Notes - Shor",
  description: "Private notes workspace.",
};

export default async function NotesPage() {
  const session = await requirePageSession();

  return (
    <div className={`${instrumentSerif.variable} ${geistMono.variable}`}>
      <NotesPageView csrfToken={session.csrfToken} />
    </div>
  );
}
