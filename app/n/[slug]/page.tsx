import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPrivateNoteBySlug } from "@/lib/account-data";
import { getUnlockCookieName, hasValidUnlockCookie } from "@/lib/link-protection";
import { createPageMetadata } from "@/lib/metadata";
import { stripNoteHtml } from "@/lib/note-html";
import UnlockNotePage from "@/components/UnlockNotePage";
import NoteClientActions from "@/components/NoteClientActions";

export const dynamic = "force-dynamic";

function formatSharedDate(value: string): string {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getNoteMetrics(html: string): { minutes: number; words: number } {
  const plainText = stripNoteHtml(html);
  const words = plainText ? plainText.split(/\s+/).length : 0;

  return {
    minutes: words > 0 ? Math.max(1, Math.round(words / 220)) : 0,
    words,
  };
}

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

  if (note.passwordHash) {
    const cookieStore = await cookies();
    const unlockCookie = cookieStore.get(getUnlockCookieName(`n/${slug}`))?.value;

    if (!hasValidUnlockCookie(`n/${slug}`, note, unlockCookie)) {
      return <UnlockNotePage slug={slug} />;
    }
  }

  const noteTitle = note.title || "Untitled Note";
  const metrics = getNoteMetrics(note.content);
  const metaItems = [
    `Updated ${formatSharedDate(note.updatedAt)}`,
    `${metrics.words} ${metrics.words === 1 ? "word" : "words"}`,
    metrics.minutes > 0 ? `${metrics.minutes} min read` : null,
  ].filter(Boolean);

  return (
    <main className="note-share-page min-h-dvh px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
      <section className="mx-auto max-w-3xl animate-morph-in">
        <div
          className="note-share-shell overflow-hidden rounded-[28px] border"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border)",
          }}
        >
          <header
            className="note-share-header border-b px-5 py-6 sm:px-7 sm:py-7"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Shared note
                </div>
                <h1
                  className="pt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                  style={{ color: "var(--text)" }}
                >
                  {noteTitle}
                </h1>
                <p
                  className="pt-3 text-sm leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {metaItems.join(" · ")}
                </p>
              </div>

              <NoteClientActions title={noteTitle} htmlContent={note.content} />
            </div>
          </header>

          <article className="note-share-content px-5 py-6 sm:px-7 sm:py-7">
            <div
              className="md-preview max-w-none"
              style={{
                fontSize: "1rem",
                lineHeight: 1.85,
              }}
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </article>
        </div>
      </section>
    </main>
  );
}
