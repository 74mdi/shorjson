"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { marked } from "marked";

// Configure marked once at module level
marked.use({ gfm: true, breaks: true });

/* ── Types ───────────────────────────────────────────────────────────────── */

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(d > 365 ? { year: "numeric" } : {}),
  });
}

function growTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function insertMd(
  ta: HTMLTextAreaElement,
  setContent: React.Dispatch<React.SetStateAction<string>>,
  before: string,
  after = "",
  placeholder = "",
) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel = value.slice(s, e) || placeholder;
  const newVal = value.slice(0, s) + before + sel + after + value.slice(e);
  setContent(newVal);
  const newEnd = s + before.length + sel.length + after.length;
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(newEnd, newEnd);
  });
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

const XSmIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SpinnerSm = () => (
  <svg
    className="animate-spin h-3 w-3"
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

/* ── MarkdownPreview ─────────────────────────────────────────────────────── */

function MarkdownPreview({ content }: { content: string }) {
  const html = content
    ? (marked.parse(content) as string)
    : "<p style='color:var(--text-faint)'>Nothing to preview</p>";
  return (
    <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */

function Toolbar({
  onInsert,
  mode,
  onMode,
}: {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
  mode: "write" | "preview";
  onMode: (m: "write" | "preview") => void;
}) {
  const tools: Array<{
    label: string;
    before: string;
    after: string;
    placeholder: string;
  }> = [
    { label: "B", before: "**", after: "**", placeholder: "bold text" },
    { label: "I", before: "_", after: "_", placeholder: "italic text" },
    { label: "H1", before: "# ", after: "", placeholder: "Heading" },
    { label: "H2", before: "## ", after: "", placeholder: "Heading" },
    { label: "`", before: "`", after: "`", placeholder: "code" },
    { label: "→", before: "[", after: "](url)", placeholder: "link text" },
    { label: "•", before: "- ", after: "", placeholder: "item" },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Format buttons */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onInsert(t.before, t.after, t.placeholder)}
            className="px-2 py-1 rounded text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] active:scale-90 transition-all duration-100"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sliding Write / Preview segmented control */}
      <div
        className="relative flex items-center rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="absolute inset-y-0 w-1/2 transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${mode === "preview" ? "100%" : "0%"})`,
            background: "var(--accent)",
          }}
        />
        <button
          type="button"
          className="relative z-10 px-2.5 py-1 text-[11px] font-medium transition-colors duration-150"
          style={{
            color: mode === "write" ? "var(--bg)" : "var(--text-muted)",
          }}
          onClick={() => onMode("write")}
        >
          Write
        </button>
        <button
          type="button"
          className="relative z-10 px-2.5 py-1 text-[11px] font-medium transition-colors duration-150"
          style={{
            color: mode === "preview" ? "var(--bg)" : "var(--text-muted)",
          }}
          onClick={() => onMode("preview")}
        >
          Preview
        </button>
      </div>
    </div>
  );
}

/* ── NoteCard ─────────────────────────────────────────────────────────────── */

interface NoteCardProps {
  note: Note;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onSave: (id: string, title: string, content: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const NoteCard = memo(function NoteCard({
  note,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: NoteCardProps) {
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Sync + focus when entering edit mode; reset mode when leaving
  useEffect(() => {
    if (isEditing) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setMode("write");
      requestAnimationFrame(() => {
        titleRef.current?.focus();
        growTextarea(contentRef.current);
      });
    } else {
      setMode("write");
    }
    // intentionally only reacting to isEditing — values are read once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Auto-grow textarea while typing (only in write mode when editing)
  useEffect(() => {
    if (isEditing && mode === "write") {
      growTextarea(contentRef.current);
    }
  }, [editContent, isEditing, mode]);

  const insertInNote = useCallback(
    (before: string, after = "", placeholder = "") => {
      if (contentRef.current) {
        insertMd(
          contentRef.current,
          setEditContent,
          before,
          after,
          placeholder,
        );
      }
    },
    [],
  );

  async function save() {
    if (!editTitle.trim() && !editContent.trim()) return;
    setSaving(true);
    await onSave(note.id, editTitle, editContent);
    setSaving(false);
  }

  const displayTitle =
    note.title || note.content.split("\n")[0].trim() || "Untitled";
  const previewContent = note.title
    ? note.content
    : note.content.split("\n").slice(1).join("\n").trim();

  return (
    <div
      className="rounded-xl overflow-hidden mb-2"
      style={{
        border: isEditing
          ? "1px solid var(--accent-soft-border)"
          : "1px solid var(--border)",
        background: isEditing ? "var(--accent-soft)" : "var(--surface)",
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      {/* ── Collapsed view (grid collapses to 0fr when editing) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isEditing ? "0fr" : "1fr",
          transition: "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            role="button"
            tabIndex={isEditing ? -1 : 0}
            onClick={() => !isEditing && onStartEdit(note.id)}
            onKeyDown={(e) => {
              if (!isEditing && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onStartEdit(note.id);
              }
            }}
            className="group w-full text-left px-4 py-3 cursor-pointer outline-none"
          >
            {/* Header row: title + date + delete */}
            <div className="flex items-start justify-between gap-2">
              <p
                className="text-xs font-semibold leading-snug flex-1 min-w-0 truncate"
                style={{ color: "var(--text)" }}
              >
                {displayTitle}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span
                  className="text-[11px] tabular-nums select-none"
                  style={{ color: "var(--text-faint)" }}
                >
                  {formatRelative(note.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  aria-label="Delete note"
                  className="flex items-center justify-center w-4 h-4 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
                  style={{ color: "var(--text-faint)" }}
                >
                  <XSmIcon />
                </button>
              </div>
            </div>

            {/* Content preview (2 lines, muted) */}
            {previewContent && (
              <p
                className="mt-1 text-xs line-clamp-2 leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {previewContent}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded view (grid expands to 1fr when editing) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isEditing ? "1fr" : "0fr",
          transition: "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          {/* 1. Title input — borderless, transparent bg */}
          <input
            ref={titleRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            tabIndex={isEditing ? 0 : -1}
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-xs font-semibold outline-none"
            style={{ color: "var(--text)" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
              if (e.key === "Enter") {
                e.preventDefault();
                contentRef.current?.focus();
              }
            }}
          />

          {/* 2. Hairline divider */}
          <div
            className="mx-4"
            style={{ height: 1, background: "var(--accent-soft-border)" }}
          />

          {/* 3. Toolbar */}
          <Toolbar onInsert={insertInNote} mode={mode} onMode={setMode} />

          {/* 4. Write area OR Preview area */}
          {mode === "write" ? (
            <textarea
              ref={contentRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                growTextarea(e.target);
              }}
              placeholder="Write Markdown…"
              rows={3}
              tabIndex={isEditing ? 0 : -1}
              className="w-full bg-transparent px-4 py-2.5 text-xs outline-none resize-none leading-relaxed"
              style={{
                fontFamily:
                  'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
                color: "var(--text)",
                minHeight: 72,
                caretColor: "var(--accent)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault();
                  save();
                }
              }}
            />
          ) : (
            <div className="px-4 py-2.5" style={{ minHeight: 72 }}>
              <MarkdownPreview content={editContent} />
            </div>
          )}

          {/* 5. Actions row */}
          <div className="flex items-center justify-end gap-2 px-4 pb-3.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] transition-opacity duration-150 hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>

            {/* Morphing Save button */}
            <button
              type="button"
              className="relative overflow-hidden flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
              disabled={saving || (!editTitle.trim() && !editContent.trim())}
              onClick={save}
            >
              {/* Invisible sizer so button doesn't collapse */}
              <span className="invisible flex items-center gap-1.5" aria-hidden>
                Saving…
              </span>
              {/* "Save →" slides up & out when saving */}
              <span
                className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
                style={{
                  transform: saving ? "translateY(-100%)" : "translateY(0)",
                }}
              >
                Save →
              </span>
              {/* "Saving…" slides in from below */}
              <span
                className="absolute inset-0 flex items-center justify-center gap-1.5 transition-transform duration-200"
                style={{
                  transform: saving ? "translateY(0)" : "translateY(100%)",
                }}
              >
                <SpinnerSm /> Saving…
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── NotesPage ───────────────────────────────────────────────────────────── */

export default function NotesPage({ csrfToken }: { csrfToken: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"write" | "preview">("write");
  const [savingCreate, setSavingCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createContentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow create textarea
  useEffect(() => {
    if (showCreate && createMode === "write") {
      growTextarea(createContentRef.current);
    }
  }, [createContent, showCreate, createMode]);

  /* ── Stable callbacks ──────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      const data = (await res.json()) as { notes?: Note[] };
      setNotes(data.notes ?? []);
    } catch {
      // fail silently on background refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = useCallback(async (id: string, t: string, c: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ title: t, content: c }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Note;
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        setEditingId(null);
      }
    } catch {
      // fail silently
    }
  }, [csrfToken]);

  const handleDelete = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken },
      }).catch(() => load());
    },
    [csrfToken, load],
  );

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  const insertInCreate = useCallback(
    (before: string, after = "", placeholder = "") => {
      if (createContentRef.current) {
        insertMd(
          createContentRef.current,
          setCreateContent,
          before,
          after,
          placeholder,
        );
      }
    },
    [],
  );

  /* ── Utilities ─────────────────────────────────────────────────────────── */

  function extract(format: "json" | "md") {
    const a = Object.assign(document.createElement("a"), {
      href: `/api/notes/export?format=${format}`,
      download: format === "md" ? "notes.md" : "notes.json",
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const t = createTitle.trim();
    const c = createContent.trim();
    if (!t && !c) return;

    setSavingCreate(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ title: t, content: c }),
      });
      const data = (await res.json()) as Note & { error?: string };

      if (!res.ok) {
        setErrorMsg(
          (data as { error?: string }).error ?? "Something went wrong.",
        );
        setErrorKey((k) => k + 1);
      } else {
        setNotes((prev) => [data as Note, ...prev]);
        setCreateTitle("");
        setCreateContent("");
        setShowCreate(false);
        setCreateMode("write");
      }
    } catch {
      setErrorMsg("Network error.");
      setErrorKey((k) => k + 1);
    } finally {
      setSavingCreate(false);
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <main className="flex h-dvh flex-col overflow-hidden px-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none w-full max-w-sm mx-auto pt-12 pb-6 animate-morph-in">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          koki
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Save and manage your notes.
        </p>
      </header>

      {/* ── Create form ──────────────────────────────────────────────────── */}
      <div className="flex-none w-full max-w-sm mx-auto pt-0 pb-4">
        <form
          onSubmit={handleSave}
          noValidate
          className="flex flex-col gap-2.5"
        >
          {/* Title input */}
          <label htmlFor="note-title" className="sr-only">
            Note title
          </label>
          <div key={errorKey} className={errorMsg ? "animate-shake" : ""}>
            <input
              id="note-title"
              type="text"
              value={createTitle}
              onChange={(e) => {
                setCreateTitle(e.target.value);
                setErrorMsg("");
              }}
              placeholder="New note…"
              disabled={savingCreate}
              autoComplete="off"
              className={[
                "w-full rounded-xl px-4 py-3.5 text-sm outline-none border transition-all duration-200",
                "bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)]",
                "border-[var(--border)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]",
                savingCreate ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
          </div>

          {/* Content toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="text-xs transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {showCreate ? "− content" : "+ content"}
            </button>

            {/* Grid-reveal wrapper */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: showCreate ? "1fr" : "0fr",
                transition:
                  "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div className="pt-2">
                  <label htmlFor="note-content" className="sr-only">
                    Note content
                  </label>
                  {/* Bordered container holding toolbar + edit area */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <Toolbar
                      onInsert={insertInCreate}
                      mode={createMode}
                      onMode={setCreateMode}
                    />
                    {createMode === "write" ? (
                      <textarea
                        id="note-content"
                        ref={createContentRef}
                        value={createContent}
                        onChange={(e) => {
                          setCreateContent(e.target.value);
                          growTextarea(e.target);
                        }}
                        placeholder="Write Markdown…"
                        disabled={savingCreate}
                        rows={3}
                        tabIndex={showCreate ? 0 : -1}
                        className={[
                          "w-full bg-transparent px-4 py-3 text-xs outline-none resize-none leading-relaxed",
                          "placeholder:text-[var(--text-muted)]",
                          savingCreate ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                        style={{
                          fontFamily:
                            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
                          color: "var(--text)",
                          minHeight: 72,
                          caretColor: "var(--accent)",
                        }}
                      />
                    ) : (
                      <div className="px-4 py-3" style={{ minHeight: 72 }}>
                        <MarkdownPreview content={createContent} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save button — morphing slide pattern */}
          <button
            type="submit"
            disabled={
              savingCreate || (!createTitle.trim() && !createContent.trim())
            }
            className={[
              "relative overflow-hidden flex w-full items-center justify-center",
              "rounded-xl py-3.5 text-sm font-semibold",
              "shadow-[0_2px_16px_var(--accent-glow)]",
              "hover:shadow-[0_4px_24px_var(--accent-glow)]",
              "active:scale-[0.98] transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100",
            ].join(" ")}
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {/* "Save →" slides up & out when saving */}
            <span
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
              style={{
                transform: savingCreate ? "translateY(-100%)" : "translateY(0)",
              }}
              aria-hidden={savingCreate}
            >
              Save →
            </span>
            {/* "Saving…" slides in from below */}
            <span
              className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300"
              style={{
                transform: savingCreate ? "translateY(0)" : "translateY(100%)",
              }}
              aria-hidden={!savingCreate}
            >
              <SpinnerSm /> Saving…
            </span>
            {/* Invisible sizer */}
            <span className="invisible" aria-hidden="true">
              Save →
            </span>
          </button>

          {/* Error message */}
          {errorMsg && (
            <p
              role="alert"
              className="text-xs font-medium animate-fade-in flex items-center gap-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <span aria-hidden="true">⚠</span> {errorMsg}
            </p>
          )}
        </form>
      </div>

      {/* ── Notes list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto w-full max-w-sm mx-auto pb-12">
        {/* Section header */}
        {!loading && (
          <div className="flex items-center justify-between mb-3 animate-morph-in">
            <span
              className="text-[10px] font-medium uppercase tracking-wider select-none tabular-nums"
              style={{ color: "var(--text-faint)" }}
            >
              {notes.length === 1 ? "1 note" : `${notes.length} notes`}
            </span>

            {notes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => extract("md")}
                  className="text-[11px] font-medium transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  ↓ md
                </button>
                <span style={{ color: "var(--text-faint)" }} aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => extract("json")}
                  className="text-[11px] font-medium transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  ↓ json
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hairline separator */}
        {!loading && (
          <div className="mb-4 h-px" style={{ background: "var(--border)" }} />
        )}

        {/* Loading state */}
        {loading && (
          <p
            className="text-center text-xs py-10 select-none"
            style={{ color: "var(--text-faint)" }}
          >
            Loading…
          </p>
        )}

        {/* Empty state */}
        {!loading && notes.length === 0 && (
          <p
            className="text-center text-xs py-10 select-none"
            style={{ color: "var(--text-faint)" }}
          >
            No notes yet
          </p>
        )}

        {/* Note cards */}
        {!loading &&
          notes.map((note, i) => {
            const delay =
              i === 0 ? "" :
              i === 1 ? "delay-50" :
              i === 2 ? "delay-100" :
              i === 3 ? "delay-150" :
              i === 4 ? "delay-200" : "delay-250";
            return (
              <div key={note.id} className={`animate-morph-slide ${delay}`}>
                <NoteCard
                  note={note}
                  isEditing={editingId === note.id}
                  onStartEdit={handleStartEdit}
                  onSave={handleUpdate}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              </div>
            );
          })}
      </div>
    </main>
  );
}
