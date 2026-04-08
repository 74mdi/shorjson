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
    minutes: Math.max(1, Math.round(Math.max(words, 1) / 220)),
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

  return (
    <main className="relative min-h-dvh overflow-hidden px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-[88%]">
        <div
          className="h-64 w-64 rounded-full blur-3xl animate-orb-drift"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-[4%]">
        <div
          className="h-72 w-72 rounded-full blur-3xl animate-orb-drift-reverse"
          style={{
            background: "color-mix(in srgb, var(--accent) 7%, transparent)",
          }}
        />
      </div>

      <section className="relative mx-auto max-w-4xl animate-morph-in">
        <div
          className="overflow-hidden rounded-[30px] border shadow-[0_30px_90px_-54px_var(--accent-glow)]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, var(--bg)) 0%, var(--bg) 100%)",
            borderColor: "var(--border)",
          }}
        >
          <header
            className="border-b px-6 py-7 sm:px-8 sm:py-8"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
              <span
                className="rounded-full border px-3 py-1"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-muted)",
                }}
              >
                Shared Note
              </span>
              <span style={{ color: "var(--text-faint)" }}>Public link</span>
            </div>

            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1
                  className="text-3xl font-semibold tracking-tight sm:text-5xl"
                  style={{ color: "var(--text)" }}
                >
                  {noteTitle}
                </h1>
                <p
                  className="pt-3 text-sm leading-7 sm:text-base"
                  style={{ color: "var(--text-muted)" }}
                >
                  Shared securely via Shor. Read it in the browser, copy the note,
                  or download a clean HTML export.
                </p>
              </div>

              <NoteClientActions title={noteTitle} htmlContent={note.content} />
            </div>

            <div
              className="mt-6 flex flex-wrap gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {[
                `Updated ${formatSharedDate(note.updatedAt)}`,
                `${metrics.words} ${metrics.words === 1 ? "word" : "words"}`,
                `${metrics.minutes} min read`,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border px-3 py-1"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </header>

          <article className="px-6 py-7 sm:px-8 sm:py-9">
            <div
              className="md-preview max-w-none rounded-[26px] border px-5 py-6 sm:px-8 sm:py-8"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
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
