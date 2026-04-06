import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPrivateNoteBySlug } from "@/lib/account-data";
import { getUnlockCookieName, hasValidUnlockCookie } from "@/lib/link-protection";
import { createPageMetadata } from "@/lib/metadata";
import UnlockNotePage from "@/components/UnlockNotePage";
import NoteClientActions from "@/components/NoteClientActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = await getPrivateNoteBySlug(slug);
  const path = `/n/${slug}`;

  if (!note || !note.isPublic) {
    return {
      ...createPageMetadata({
        title: `Note Not Found - Shor`,
        description: "This note is not available.",
        path,
        eyebrow: "Private Note",
        badge: "Unavailable",
        ogTitle: `Note Not Found`,
      }),
      robots: { index: false },
    };
  }

  if (note.passwordHash) {
    return {
      ...createPageMetadata({
        title: `Protected Note - Shor`,
        description: "Password-protected note hosted on Shor.",
        path,
        eyebrow: "Protected Note",
        badge: "Locked",
        ogTitle: `Protected Note`,
      }),
      robots: { index: false },
    };
  }

  return createPageMetadata({
    title: `${note.title || "Untitled Note"} - Shor`,
    description: "Shared note hosted on Shor.",
    path,
    eyebrow: "Shared Note",
    badge: "Public",
    ogTitle: note.title || "Untitled Note",
  });
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getPrivateNoteBySlug(slug);

  if (!note || !note.isPublic) {
    notFound();
  }

  // Handle password protection
  if (note.passwordHash) {
    const cookieStore = await cookies();
    const unlockCookie = cookieStore.get(getUnlockCookieName(`n/${slug}`))?.value;

    if (!hasValidUnlockCookie(`n/${slug}`, note, unlockCookie)) {
      return <UnlockNotePage slug={slug} />;
    }
  }

  return (
    <main className="min-h-dvh bg-gray-50 px-5 pb-16 pt-16 selection:bg-[#1c1916] selection:text-white sm:px-10 md:pt-24">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1c1916] md:text-4xl">
              {note.title || "Untitled Note"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Shared securely via Shor. Last updated on{" "}
              {new Date(note.updatedAt).toLocaleDateString()}.
            </p>
          </div>
          <NoteClientActions title={note.title} htmlContent={note.content} />
        </header>

        <article
          className="prose prose-gray prose-p:leading-relaxed prose-pre:bg-[#1c1916] prose-pre:text-gray-100 prose-img:rounded-xl prose-a:text-blue-600 max-w-none rounded-3xl border border-gray-200 bg-white p-8 shadow-sm md:p-12"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>
    </main>
  );
}
