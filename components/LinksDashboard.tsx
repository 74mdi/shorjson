"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { bioLinkCreateSchema } from "@/lib/schemas";

interface BioLink {
  id: string;
  title: string;
  url: string;
  order: number;
  createdAt: string;
}

interface LinkRowProps {
  csrfToken: string;
  index: number;
  isRemoving: boolean;
  link: BioLink;
  onDelete: (id: string) => Promise<void>;
  onSave: (
    id: string,
    payload: { title: string; url: string },
  ) => Promise<{ ok: boolean; fieldErrors?: Record<string, string[]> }>;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v7h-7" />
      <path d="M3 10V3h7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function sortLinks(items: BioLink[]): BioLink[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function buttonClassName() {
  return "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function LinkRow({
  csrfToken,
  index,
  isRemoving,
  link,
  onDelete,
  onSave,
}: LinkRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(link.title);
  const [draftUrl, setDraftUrl] = useState(link.url);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftTitle(link.title);
    setDraftUrl(link.url);
  }, [link.title, link.url]);

  async function handleCopy() {
    await copyToClipboard(link.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleSave() {
    setSaving(true);
    const result = await onSave(link.id, {
      title: draftTitle,
      url: draftUrl,
    });
    setSaving(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setFieldErrors({});
    setEditing(false);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${index * 30}ms`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "animate-list-in rounded-xl border px-3 py-3 transition-all duration-200",
        isRemoving ? "pointer-events-none -translate-y-1 opacity-0" : "",
      ].join(" ")}
      aria-live="polite"
    >
      <div
        style={{
          borderColor: "var(--border)",
          background: isDragging ? "var(--accent-soft)" : "var(--surface)",
          boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>

          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  disabled={saving}
                  maxLength={60}
                  className="w-full rounded-xl border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  style={{ borderColor: "var(--border)" }}
                />
                {fieldErrors.title?.[0] ? (
                  <p className="text-[11px]" style={{ color: "#dc2626" }}>
                    {fieldErrors.title[0]}
                  </p>
                ) : null}

                <input
                  type="url"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  style={{ borderColor: "var(--border)" }}
                />
                {fieldErrors.url?.[0] ? (
                  <p className="text-[11px]" style={{ color: "#dc2626" }}>
                    {fieldErrors.url[0]}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className={buttonClassName()}
                    style={{
                      borderColor: "var(--accent-soft-border)",
                      background: "var(--accent)",
                      color: "var(--bg)",
                    }}
                  >
                    {saving ? <Spinner /> : null}
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTitle(link.title);
                      setDraftUrl(link.url);
                      setFieldErrors({});
                      setEditing(false);
                    }}
                    className={buttonClassName()}
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {link.title}
                  </p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text)]"
                    title="Open link"
                  >
                    <ExternalLinkIcon />
                  </a>
                </div>
                <p
                  className="truncate pt-1 text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {link.url}
                </p>
                <div className="flex flex-wrap gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={buttonClassName()}
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <CopyIcon />
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className={buttonClassName()}
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <EditIcon />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(link.id)}
                    className={buttonClassName()}
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <TrashIcon />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LinksDashboard({
  csrfToken,
  username,
}: {
  csrfToken: string;
  username: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );
  const [links, setLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);

  async function loadLinks() {
    try {
      const response = await fetch("/api/links", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        links?: BioLink[];
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to load links.");
        setLoading(false);
        return;
      }

      setLinks(sortLinks(data.links ?? []));
      setError("");
    } catch {
      setError("Unable to load links.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLinks();
  }, []);

  const ids = useMemo(() => links.map((link) => link.id), [links]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFormErrors({});

    const parsed = bioLinkCreateSchema.safeParse({ title, url });
    if (!parsed.success) {
      setFormErrors(parsed.error.flatten().fieldErrors);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      } & Partial<BioLink>;

      if (!response.ok) {
        setError(data.error ?? "Unable to save link.");
        setFormErrors(data.fieldErrors ?? {});
        setSubmitting(false);
        return;
      }

      setLinks((current) => sortLinks([...current, data as BioLink]));
      setTitle("");
      setUrl("");
      setSubmitting(false);
    } catch {
      setError("Unable to save link.");
      setSubmitting(false);
    }
  }

  async function handleSave(
    id: string,
    payload: { title: string; url: string },
  ): Promise<{ ok: boolean; fieldErrors?: Record<string, string[]> }> {
    const parsed = bioLinkCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const response = await fetch(`/api/links/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(parsed.data),
    });
    const data = (await response.json().catch(() => ({}))) as
      | (BioLink & { error?: string })
      | { error?: string; fieldErrors?: Record<string, string[]> };

    if (!response.ok) {
      setError(data.error ?? "Unable to update link.");
      return {
        ok: false,
        fieldErrors:
          "fieldErrors" in data && data.fieldErrors ? data.fieldErrors : {},
      };
    }

    setLinks((current) =>
      sortLinks(
        current.map((item) => (item.id === id ? (data as BioLink) : item)),
      ),
    );
    setError("");
    return { ok: true };
  }

  async function handleDelete(id: string) {
    setRemovingIds((current) => [...current, id]);

    try {
      const response = await fetch(`/api/links/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Unable to delete link.");
        setRemovingIds((current) => current.filter((value) => value !== id));
        return;
      }

      window.setTimeout(() => {
        setLinks((current) => current.filter((item) => item.id !== id));
        setRemovingIds((current) => current.filter((value) => value !== id));
      }, 180);
    } catch {
      setError("Unable to delete link.");
      setRemovingIds((current) => current.filter((value) => value !== id));
    }
  }

  async function persistOrder(nextLinks: BioLink[]) {
    const updates = nextLinks.map((link, index) => ({
      id: link.id,
      order: index,
    }));

    await Promise.all(
      updates.map((update) =>
        fetch(`/api/links/${encodeURIComponent(update.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ order: update.order }),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to reorder links.");
          }
        }),
      ),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(links, oldIndex, newIndex).map((link, index) => ({
      ...link,
      order: index,
    }));

    setLinks(reordered);
    setReordering(true);

    try {
      await persistOrder(reordered);
      setError("");
    } catch {
      setError("Unable to reorder links.");
      void loadLinks();
    } finally {
      setReordering(false);
    }
  }

  return (
    <main className="animate-page-fade flex min-h-dvh flex-col items-center px-5 pb-20">
      <div className="w-full max-w-xl pt-12">
        <header className="animate-morph-in pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                @{username}
              </p>
              <h1 className="pt-1 text-2xl font-bold tracking-tight">Links</h1>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Build a private list of links and drag them into order.
              </p>
            </div>

            <a
              href="/api/export"
              className="inline-flex h-10 items-center rounded-xl border px-3 text-sm font-medium transition-all duration-150"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text-muted)",
              }}
            >
              Export
            </a>
          </div>
        </header>

        <section
          className="animate-morph-in delay-100 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
          }}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="link-title"
                className="text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                Title
              </label>
              <input
                id="link-title"
                type="text"
                value={title}
                maxLength={60}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Portfolio"
                disabled={submitting}
                className="w-full rounded-xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                style={{ borderColor: "var(--border)" }}
              />
              <p className="min-h-[16px] text-[11px]" style={{ color: "#dc2626" }}>
                {formErrors.title?.[0] ?? ""}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="link-url"
                className="text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "var(--text-faint)" }}
              >
                URL
              </label>
              <input
                id="link-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                disabled={submitting}
                className="w-full rounded-xl border bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                style={{ borderColor: "var(--border)" }}
              />
              <p className="min-h-[16px] text-[11px]" style={{ color: "#dc2626" }}>
                {formErrors.url?.[0] ?? ""}
              </p>
            </div>

            {error ? (
              <p className="text-sm" style={{ color: "#dc2626" }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              {submitting ? <Spinner /> : null}
              <span>Add link</span>
            </button>
          </form>
        </section>

        <section className="animate-morph-in delay-150 pt-6">
          <div className="flex items-center justify-between pb-3">
            <p
              className="text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--text-faint)" }}
            >
              Personal links
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {reordering ? "Saving order..." : `${links.length} saved`}
            </p>
          </div>

          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : links.length === 0 ? (
            <div
              className="rounded-2xl border px-4 py-6 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text-muted)",
              }}
            >
              Add your first private link to get started.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {links.map((link, index) => (
                    <LinkRow
                      key={link.id}
                      csrfToken={csrfToken}
                      index={index}
                      isRemoving={removingIds.includes(link.id)}
                      link={link}
                      onDelete={handleDelete}
                      onSave={handleSave}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </main>
  );
}
