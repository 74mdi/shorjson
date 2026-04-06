"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./NotesDashboard.module.css";
import { sanitizeNoteHtml, sanitizeNoteLink, stripNoteHtml } from "@/lib/note-html";

interface PrivateNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface FormatState {
  bold: boolean;
  code: boolean;
  h1: boolean;
  h2: boolean;
  italic: boolean;
  link: boolean;
  underline: boolean;
}

const EMPTY_FORMAT_STATE: FormatState = {
  bold: false,
  code: false,
  h1: false,
  h2: false,
  italic: false,
  link: false,
  underline: false,
};

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRelativeTimestamp(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    ...(days > 365 ? { year: "numeric" } : {}),
  });
}

function getEditorMeta(value: string): string {
  return `Updated ${new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function sortNotes(items: PrivateNote[]): PrivateNote[] {
  return [...items].sort((left, right) => {
    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

function getNotePreview(note: PrivateNote): string {
  const text = stripNoteHtml(note.content);
  if (!text) return "Empty note";
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function getNoteTitle(note: PrivateNote): string {
  return note.title || "Untitled";
}

function getTextStats(html: string): { chars: number; words: number } {
  const text = stripNoteHtml(html);
  return {
    chars: text.length,
    words: text ? text.split(/\s+/).length : 0,
  };
}

function getNearestTag(
  root: HTMLElement | null,
  node: Node | null,
  tagName: string,
): HTMLElement | null {
  let current: Node | null = node;

  while (current && current !== root) {
    if (
      current instanceof HTMLElement &&
      current.tagName.toLowerCase() === tagName.toLowerCase()
    ) {
      return current;
    }

    current = current.parentNode;
  }

  return null;
}

function isSelectionInside(root: HTMLElement | null): boolean {
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) return false;

  const anchorNode = selection.anchorNode;
  return Boolean(anchorNode && root.contains(anchorNode));
}

function normaliseEditorHtml(value: string): string {
  const html = value.trim();
  if (
    !html ||
    html === "<br>" ||
    html === "<div><br></div>" ||
    html === "<p><br></p>"
  ) {
    return "";
  }

  return html;
}

export default function NotesDashboard({
  csrfToken,
  username,
}: {
  csrfToken: string;
  username: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const focusTitleOnOpenRef = useRef(false);
  const lastSavedRef = useRef({
    content: "",
    id: "" as string | null,
    title: "",
  });

  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [formatState, setFormatState] = useState<FormatState>(
    EMPTY_FORMAT_STATE,
  );

  const deferredSearch = useDeferredValue(search);
  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, notes],
  );
  const filteredNotes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title} ${stripNoteHtml(note.content)}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, notes]);
  const stats = useMemo(() => getTextStats(draftContent), [draftContent]);

  function clearSaveTimers() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = null;
    }
  }

  function setSavedState() {
    setSaveState("saved");
    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 1850);
  }

  function updateToolbarState() {
    const editor = editorRef.current;
    if (!editor || !isSelectionInside(editor)) {
      setFormatState(EMPTY_FORMAT_STATE);
      return;
    }

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode ?? null;

    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      h1: Boolean(getNearestTag(editor, anchorNode, "h1")),
      h2: Boolean(getNearestTag(editor, anchorNode, "h2")),
      code: Boolean(getNearestTag(editor, anchorNode, "code")),
      link: Boolean(getNearestTag(editor, anchorNode, "a")),
    });
  }

  function syncEditorLinks() {
    editorRef.current?.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
  }

  function readEditorHtml(): string {
    return normaliseEditorHtml(editorRef.current?.innerHTML ?? draftContent);
  }

  function syncDraftFromEditor(options?: { scheduleSave?: boolean }) {
    const nextContent = readEditorHtml();
    setDraftContent(nextContent);

    if (options?.scheduleSave) {
      queueSave(nextContent, draftTitle);
    }
  }

  function queueSave(nextContent = draftContent, nextTitle = draftTitle) {
    if (!activeNoteId) return;

    if (
      lastSavedRef.current.id === activeNoteId &&
      lastSavedRef.current.title === nextTitle &&
      lastSavedRef.current.content === nextContent
    ) {
      setSaveState("idle");
      return;
    }

    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = null;
    }

    if (saveState === "saved") {
      setSaveState("idle");
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void persistDraft();
    }, 800);
  }

  async function persistDraft(): Promise<boolean> {
    const noteId = activeNoteId;
    if (!noteId) return true;

    const currentTitle = draftTitle.slice(0, 100);
    const currentContent = readEditorHtml();

    if (
      lastSavedRef.current.id === noteId &&
      lastSavedRef.current.title === currentTitle &&
      lastSavedRef.current.content === currentContent
    ) {
      setSaveState("idle");
      return true;
    }

    clearSaveTimers();
    setSaveState("saving");
    setError("");

    const savePromise = (async () => {
      try {
        const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({
            title: currentTitle,
            content: sanitizeNoteHtml(currentContent),
          }),
        });
        const data = (await response.json().catch(() => ({}))) as
          | PrivateNote
          | { error?: string };

        if (!response.ok) {
          setSaveState("error");
          setError(("error" in data && data.error) || "Unable to save note.");
          return false;
        }

        const updatedNote = data as PrivateNote;
        lastSavedRef.current = {
          id: updatedNote.id,
          title: updatedNote.title,
          content: updatedNote.content,
        };

        setNotes((current) =>
          sortNotes(
            current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
          ),
        );
        setDraftTitle(updatedNote.title);
        setDraftContent(updatedNote.content);
        setSavedState();

        if (
          editorRef.current &&
          document.activeElement !== editorRef.current &&
          editorRef.current.innerHTML !== updatedNote.content
        ) {
          editorRef.current.innerHTML = updatedNote.content;
        }

        return true;
      } catch {
        setSaveState("error");
        setError("Unable to save note.");
        return false;
      }
    })();

    savePromiseRef.current = savePromise;
    const didSave = await savePromise;
    if (savePromiseRef.current === savePromise) {
      savePromiseRef.current = null;
    }
    return didSave;
  }

  async function flushPendingSave() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      await persistDraft();
      return;
    }

    if (savePromiseRef.current) {
      await savePromiseRef.current;
    }
  }

  async function loadNotes() {
    try {
      const response = await fetch("/api/notes", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        notes?: PrivateNote[];
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to load notes.");
        setLoading(false);
        return;
      }

      setNotes(sortNotes(data.notes ?? []));
      setError("");
    } catch {
      setError("Unable to load notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();

    return () => {
      clearSaveTimers();
    };
  }, []);

  useEffect(() => {
    if (!notes.length) {
      setActiveNoteId(null);
      setDraftTitle("");
      setDraftContent("");
      lastSavedRef.current = { id: null, title: "", content: "" };
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      return;
    }

    if (!activeNoteId || !notes.some((note) => note.id === activeNoteId)) {
      setActiveNoteId(notes[0].id);
    }
  }, [activeNoteId, notes]);

  useEffect(() => {
    if (!activeNote) return;

    setDraftTitle(activeNote.title);
    setDraftContent(activeNote.content);
    lastSavedRef.current = {
      id: activeNote.id,
      title: activeNote.title,
      content: activeNote.content,
    };
    setSaveState("idle");
    setError("");

    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = activeNote.content;
        syncEditorLinks();
      }

      if (focusTitleOnOpenRef.current) {
        titleInputRef.current?.focus();
        focusTitleOnOpenRef.current = false;
      }

      updateToolbarState();
    });
  }, [activeNote?.id]);

  useEffect(() => {
    function handleSelectionChange() {
      updateToolbarState();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [activeNote?.id]);

  async function handleCreateNote() {
    await flushPendingSave();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ title: "", content: "" }),
      });
      const data = (await response.json().catch(() => ({}))) as
        | PrivateNote
        | { error?: string };

      if (!response.ok) {
        setError(("error" in data && data.error) || "Unable to create note.");
        setCreating(false);
        return;
      }

      const createdNote = data as PrivateNote;
      focusTitleOnOpenRef.current = true;
      setNotes((current) => sortNotes([createdNote, ...current]));
      setActiveNoteId(createdNote.id);
      setCreating(false);
    } catch {
      setError("Unable to create note.");
      setCreating(false);
    }
  }

  async function handleSelectNote(noteId: string) {
    if (noteId === activeNoteId) return;

    await flushPendingSave();
    setActiveNoteId(noteId);
  }

  async function handleDeleteActiveNote() {
    if (!activeNote || deleting) return;

    if (!window.confirm("Delete this note?")) return;

    clearSaveTimers();
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/notes/${encodeURIComponent(activeNote.id)}`,
        {
          method: "DELETE",
          headers: { "x-csrf-token": csrfToken },
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to delete note.");
        setDeleting(false);
        return;
      }

      setNotes((current) => {
        const index = current.findIndex((note) => note.id === activeNote.id);
        const remaining = current.filter((note) => note.id !== activeNote.id);
        const nextNote = remaining[index] ?? remaining[index - 1] ?? null;
        setActiveNoteId(nextNote?.id ?? null);
        return remaining;
      });

      setDeleting(false);
    } catch {
      setError("Unable to delete note.");
      setDeleting(false);
    }
  }

  function handleTitleChange(nextTitle: string) {
    const value = nextTitle.slice(0, 100);
    setDraftTitle(value);
    queueSave(draftContent, value);
  }

  function executeCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorLinks();
    syncDraftFromEditor({ scheduleSave: true });
    updateToolbarState();
  }

  function handleHeading(level: "H1" | "H2") {
    if (level === "H1" && formatState.h1) {
      executeCommand("formatBlock", "P");
      return;
    }

    if (level === "H2" && formatState.h2) {
      executeCommand("formatBlock", "P");
      return;
    }

    executeCommand("formatBlock", level);
  }

  function handleCode() {
    editorRef.current?.focus();
    const selection = window.getSelection();
    const selectedText = selection?.toString() ?? "";
    const html = `<code>${escapeHtml(selectedText || "code")}</code>`;
    document.execCommand("insertHTML", false, html);
    syncDraftFromEditor({ scheduleSave: true });
    updateToolbarState();
  }

  function handleLink() {
    editorRef.current?.focus();
    const rawUrl = window.prompt("Enter link URL");
    if (!rawUrl) return;

    const safeUrl = sanitizeNoteLink(rawUrl);
    if (!safeUrl) {
      setError("Enter a valid http:// or https:// URL.");
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>`,
      );
    } else {
      document.execCommand("createLink", false, safeUrl);
    }

    syncEditorLinks();
    syncDraftFromEditor({ scheduleSave: true });
    updateToolbarState();
  }

  const toolbarButtons: Array<{
    active?: boolean;
    label: string;
    onClick: () => void;
  }> = [
    {
      active: formatState.bold,
      label: "B",
      onClick: () => executeCommand("bold"),
    },
    {
      active: formatState.italic,
      label: "I",
      onClick: () => executeCommand("italic"),
    },
    {
      active: formatState.underline,
      label: "U",
      onClick: () => executeCommand("underline"),
    },
    {
      active: formatState.h1,
      label: "H1",
      onClick: () => handleHeading("H1"),
    },
    {
      active: formatState.h2,
      label: "H2",
      onClick: () => handleHeading("H2"),
    },
    {
      label: "—",
      onClick: () => executeCommand("insertHorizontalRule"),
    },
    {
      active: formatState.code,
      label: "`",
      onClick: handleCode,
    },
    {
      active: formatState.link,
      label: "Link",
      onClick: handleLink,
    },
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div>
            <Link href="/" className={styles.logoLink}>
              <span className={styles.logoDot}>●</span>
              <span>Shor</span>
            </Link>
            <p className={styles.noteItemTime}>@{username}</p>
          </div>

          <button
            type="button"
            className={styles.newNoteButton}
            onClick={() => void handleCreateNote()}
            disabled={creating}
          >
            {creating ? "Creating..." : "+ New Note"}
          </button>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={styles.searchInput}
            placeholder="Search notes"
          />

          <div className={styles.sidebarRule} />

          <div className={styles.noteList}>
            {loading ? (
              <div className={styles.emptySidebar}>
                <Spinner />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className={styles.emptySidebar}>
                {search.trim()
                  ? "No notes match this search."
                  : "Create a note to start writing."}
              </div>
            ) : (
              filteredNotes.map((note, index) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => void handleSelectNote(note.id)}
                  className={[
                    styles.noteItem,
                    activeNoteId === note.id ? styles.noteItemActive : "",
                  ].join(" ")}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={styles.noteItemTitle}>{getNoteTitle(note)}</div>
                  <div className={styles.noteItemPreview}>
                    {getNotePreview(note)}
                  </div>
                  <div className={styles.noteItemTime}>
                    {getRelativeTimestamp(note.updatedAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={styles.editorShell}>
          <div className={styles.mobileShelf}>
            <div className={styles.mobileShelfHeader}>
              <div>
                <div className={styles.mobileShelfTitle}>Notes</div>
                <div className={styles.mobileShelfMeta}>@{username}</div>
              </div>
              <button
                type="button"
                className={styles.mobileNewNoteButton}
                onClick={() => void handleCreateNote()}
                disabled={creating}
              >
                {creating ? "Creating..." : "+ New"}
              </button>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.mobileSearchInput}
              placeholder="Search notes"
            />

            <div className={styles.mobileNoteScroller}>
              {loading ? (
                <div className={styles.mobileEmptyState}>
                  <Spinner />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className={styles.mobileEmptyState}>
                  {search.trim()
                    ? "No notes match this search."
                    : "Create a note to start writing."}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => void handleSelectNote(note.id)}
                    className={[
                      styles.mobileNoteCard,
                      activeNoteId === note.id ? styles.mobileNoteCardActive : "",
                    ].join(" ")}
                  >
                    <div className={styles.mobileNoteCardTitle}>
                      {getNoteTitle(note)}
                    </div>
                    <div className={styles.mobileNoteCardPreview}>
                      {getNotePreview(note)}
                    </div>
                    <div className={styles.mobileNoteCardTime}>
                      {getRelativeTimestamp(note.updatedAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={styles.editorPanel}>
            <div key={activeNote?.id ?? "empty"} className={styles.editorPanelInner}>
              {activeNote ? (
                <>
                  <header className={styles.editorHeader}>
                    <div className={styles.editorMetaRow}>
                      <div className={styles.editorMeta}>
                        {getEditorMeta(activeNote.updatedAt)}
                      </div>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => void handleDeleteActiveNote()}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    <input
                      ref={titleInputRef}
                      type="text"
                      value={draftTitle}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      onBlur={() => void persistDraft()}
                      maxLength={100}
                      className={styles.titleInput}
                      placeholder="Untitled"
                    />
                  </header>

                  <div className={styles.toolbar}>
                    {toolbarButtons.map((button) => (
                      <button
                        key={button.label}
                        type="button"
                        className={[
                          styles.toolbarButton,
                          button.active ? styles.toolbarButtonActive : "",
                        ].join(" ")}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={button.onClick}
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>

                  <div className={styles.editorFrame}>
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className={styles.editorBody}
                      data-empty={draftContent ? "false" : "true"}
                      data-placeholder="Write something quiet, bold, messy, useful."
                      onInput={() => syncDraftFromEditor({ scheduleSave: true })}
                      onBlur={() => void persistDraft()}
                      onKeyUp={updateToolbarState}
                      onMouseUp={updateToolbarState}
                      onPaste={(event) => {
                        event.preventDefault();
                        const text = event.clipboardData.getData("text/plain");
                        document.execCommand("insertText", false, text);
                        syncDraftFromEditor({ scheduleSave: true });
                      }}
                    />

                    <footer className={styles.editorFooter}>
                      <div>
                        {stats.words} words · {stats.chars} chars
                      </div>
                      <div
                        className={[
                          styles.saveIndicator,
                          saveState === "saving" ? styles.saveIndicatorSaving : "",
                          saveState === "saved" ? styles.saveIndicatorSaved : "",
                          saveState === "error" ? styles.saveIndicatorError : "",
                        ].join(" ")}
                      >
                        {saveState === "saving"
                          ? "saving..."
                          : saveState === "saved"
                            ? "saved"
                            : saveState === "error"
                              ? "save failed"
                              : ""}
                      </div>
                    </footer>
                  </div>
                </>
              ) : (
                <div className={styles.emptyPanel}>
                  <div className={styles.emptyPanelCard}>
                    <div className={styles.emptyPanelTitle}>Open a note.</div>
                    <p className={styles.emptyPanelText}>
                      Pick one from the sidebar or create a new note to start
                      writing.
                    </p>
                    <button
                      type="button"
                      className={styles.emptyPanelAction}
                      onClick={() => void handleCreateNote()}
                      disabled={creating}
                    >
                      {creating ? "Creating..." : "+ New Note"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p
              style={{
                color: "#c0392b",
                fontSize: "0.74rem",
                paddingTop: "10px",
              }}
            >
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
