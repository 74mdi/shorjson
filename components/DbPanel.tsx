"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */

type DbType = "mongodb" | "postgresql" | "mysql" | "sqlite" | "redis";

interface DbConn {
  id: string;
  name: string;
  type: DbType;
  connectionString: string;
  isActive: boolean;
  createdAt: string;
  lastTestStatus?: "ok" | "error";
  lastTestMessage?: string;
}

interface PanelData {
  connections: DbConn[];
  localIsActive: boolean;
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

const XIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Spinner = () => (
  <svg
    className="animate-spin h-3 w-3"
    viewBox="0 0 24 24"
    fill="none"
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const PLACEHOLDERS: Record<DbType, string> = {
  mongodb: "mongodb://localhost:27017/mydb  or  mongodb+srv://...",
  postgresql: "postgresql://user:pass@localhost:5432/mydb",
  mysql: "mysql://user:pass@localhost:3306/mydb  (npm install mysql2)",
  sqlite: "/absolute/path/to/database.sqlite  (npm install better-sqlite3)",
  redis: "redis://localhost:6379  (npm install ioredis)",
};

const DB_LABELS: Record<DbType, string> = {
  mongodb: "MongoDB",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  redis: "Redis",
};

/* ── Section heading ─────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-widest mb-3 select-none"
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </p>
  );
}

/* ── Shared button styles ────────────────────────────────────────────────── */

const btnBase = [
  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5",
  "text-xs font-medium border transition-all duration-150",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

function OutlineBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={btnBase}
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
      }}
      onMouseEnter={(e) =>
        !disabled && (e.currentTarget.style.color = "var(--text)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${btnBase} active:scale-95`}
      style={{
        background: "var(--accent)",
        border: "1px solid var(--accent)",
        color: "var(--bg)",
      }}
      onMouseEnter={(e) =>
        !disabled && (e.currentTarget.style.background = "var(--accent-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
    >
      {children}
    </button>
  );
}

function DashedBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl px-3 py-2.5 text-xs font-medium border border-dashed transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = "var(--text)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function DbPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // ── DB connections state
  const [data, setData] = useState<PanelData>({
    connections: [],
    localIsActive: true,
  });
  const [loadingConns, setLoadingConns] = useState(true);
  // Add-form state
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<DbType>("mongodb");
  const [newName, setNewName] = useState("");
  const [newConn, setNewConn] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  // Per-connection action state
  const [actionId, setActionId] = useState<string | null>(null);

  // ── Remote server state
  const [remoteUrl, setRemoteUrl] = useState("");
  const [savedRemote, setSavedRemote] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<
    "idle" | "testing" | "connected" | "error"
  >("idle");
  const [remoteMsg, setRemoteMsg] = useState("");

  // ── Export state
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Import state
  const [importing, setImporting] = useState<"links" | "notes" | null>(null);
  const linksImportRef = useRef<HTMLInputElement>(null);
  const notesImportRef = useRef<HTMLInputElement>(null);

  const loadConnections = useCallback(async () => {
    try {
      const r = await fetch("/api/db-connections");
      const d = (await r.json()) as PanelData;
      setData(d);
    } catch {
      /* silent */
    } finally {
      setLoadingConns(false);
    }
  }, []);

  const loadRemote = useCallback(async () => {
    try {
      const r = await fetch("/api/config");
      const d = (await r.json()) as { remoteServerUrl?: string | null };
      if (d.remoteServerUrl) {
        setSavedRemote(d.remoteServerUrl);
        setRemoteUrl(d.remoteServerUrl);
        setRemoteStatus("connected");
        setRemoteMsg("Connected — " + d.remoteServerUrl);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadConnections();
    loadRemote();
  }, [open, loadConnections, loadRemote]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  /* ── DB actions ── */
  async function testNew() {
    setTestStatus("testing");
    setTestMsg("Testing…");
    try {
      const r = await fetch("/api/db-connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, connectionString: newConn }),
      });
      const d = (await r.json()) as { ok: boolean; message?: string };
      setTestStatus(d.ok ? "ok" : "error");
      setTestMsg(d.message ?? (d.ok ? "Connected ✓" : "Failed"));
    } catch {
      setTestStatus("error");
      setTestMsg("Network error");
    }
  }

  async function saveNew() {
    if (!newName.trim() || !newConn.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/db-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          connectionString: newConn,
        }),
      });
      if (r.ok) {
        await loadConnections();
        setShowAdd(false);
        setNewName("");
        setNewConn("");
        setTestStatus("idle");
        setTestMsg("");
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: string) {
    setActionId(id);
    try {
      await fetch(`/api/db-connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setActive: true }),
      });
      await loadConnections();
    } catch {
      /* silent */
    } finally {
      setActionId(null);
    }
  }

  async function deactivate(id: string) {
    setActionId(id);
    try {
      await fetch(`/api/db-connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setActive: false }),
      });
      await loadConnections();
    } catch {
      /* silent */
    } finally {
      setActionId(null);
    }
  }

  async function removeConn(id: string) {
    setActionId(id);
    try {
      await fetch(`/api/db-connections/${id}`, { method: "DELETE" });
      await loadConnections();
    } catch {
      /* silent */
    } finally {
      setActionId(null);
    }
  }

  async function testExisting(id: string) {
    const conn = data.connections.find((c) => c.id === id);
    if (!conn) return;
    setActionId(id);
    try {
      await fetch("/api/db-connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: conn.type,
          connectionString: conn.connectionString,
        }),
      });
    } catch {
      /* silent */
    } finally {
      setActionId(null);
      await loadConnections();
    }
  }

  /* ── Remote server actions ── */
  async function testRemote() {
    setRemoteStatus("testing");
    setRemoteMsg("Testing…");
    try {
      const r = await fetch(`${remoteUrl.trim()}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) {
        const d = (await r.json()) as {
          ok?: boolean;
          version?: string;
          links?: number;
        };
        setRemoteStatus("idle");
        setRemoteMsg(
          `✓ Reachable — ${d.links ?? 0} links, v${d.version ?? "?"}`,
        );
      } else {
        setRemoteStatus("error");
        setRemoteMsg("✗ Server returned " + r.status);
      }
    } catch {
      setRemoteStatus("error");
      setRemoteMsg("✗ Could not connect");
    }
  }

  async function connectRemote() {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverUrl: remoteUrl.trim() }),
    });
    setSavedRemote(remoteUrl.trim());
    setRemoteStatus("connected");
    setRemoteMsg("Connected — " + remoteUrl.trim());
  }

  async function disconnectRemote() {
    await fetch("/api/config", { method: "DELETE" });
    setSavedRemote(null);
    setRemoteStatus("idle");
    setRemoteMsg("");
    setRemoteUrl("http://localhost:4000");
  }

  /* ── Export ── */
  function exportFile(href: string, filename: string) {
    setExporting(filename);
    const a = Object.assign(document.createElement("a"), {
      href,
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setExporting(null), 2000);
  }

  /* ── Import ── */
  async function importFile(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "links" | "notes",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(type);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const url = type === "links" ? "/api/links/import" : "/api/notes/import";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await r.json()) as { imported?: number; error?: string };
      if (!r.ok) console.error("Import error:", result.error);
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(null);
    }
  }

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl animate-fade-in-up overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.14)",
          maxHeight: "82vh",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Databases and settings"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg transition-opacity duration-150 hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(82vh - 64px)" }}
        >
          <div className="px-5 py-5 flex flex-col gap-6">
            {/* ══ DATABASES ══════════════════════════════════════════════════ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Databases</SectionLabel>
                <button
                  type="button"
                  onClick={() => setShowAdd((v) => !v)}
                  className="text-[11px] font-medium transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showAdd ? "− cancel" : "+ add"}
                </button>
              </div>

              {/* Add form */}
              {showAdd && (
                <div
                  className="rounded-xl p-4 mb-4 animate-fade-in"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Type picker */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {(
                      [
                        "mongodb",
                        "postgresql",
                        "mysql",
                        "sqlite",
                        "redis",
                      ] as DbType[]
                    ).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setNewType(t);
                          setTestStatus("idle");
                          setTestMsg("");
                        }}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium border transition-all duration-150"
                        style={{
                          background:
                            newType === t ? "var(--accent)" : "var(--surface)",
                          border: `1px solid ${newType === t ? "var(--accent)" : "var(--border)"}`,
                          color: newType === t ? "var(--bg)" : "var(--text-muted)",
                        }}
                      >
                        {DB_LABELS[t]}
                      </button>
                    ))}
                  </div>

                  {/* Name */}
                  <label
                    className="block text-[11px] mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My database"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border mb-2.5 bg-[var(--surface)] text-[var(--text)] transition-all duration-150"
                    style={{ border: "1px solid var(--border)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-glow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />

                  {/* Connection string */}
                  <label
                    className="block text-[11px] mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Connection string
                  </label>
                  <input
                    value={newConn}
                    onChange={(e) => setNewConn(e.target.value)}
                    placeholder={PLACEHOLDERS[newType]}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border mb-2.5 bg-[var(--surface)] text-[var(--text)] font-mono transition-all duration-150"
                    style={{ border: "1px solid var(--border)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-glow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />

                  {/* Test message */}
                  {testMsg && (
                    <p
                      key={testMsg}
                      className="text-[11px] mb-2.5 animate-fade-in"
                      style={{
                        color:
                          testStatus === "ok"
                            ? "var(--text)"
                            : testStatus === "error"
                              ? "#ef4444"
                              : "var(--text-muted)",
                      }}
                    >
                      {testMsg}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <OutlineBtn
                      onClick={testNew}
                      disabled={!newConn.trim() || testStatus === "testing"}
                    >
                      {testStatus === "testing" ? (
                        <>
                          <Spinner /> Testing…
                        </>
                      ) : (
                        "Test"
                      )}
                    </OutlineBtn>
                    <PrimaryBtn
                      onClick={saveNew}
                      disabled={saving || !newName.trim() || !newConn.trim()}
                    >
                      {saving ? (
                        <>
                          <Spinner /> Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </PrimaryBtn>
                  </div>
                </div>
              )}

              {/* Connection list */}
              <div className="flex flex-col gap-2">
                {/* Saved connections */}
                {loadingConns && (
                  <p
                    className="text-xs py-3 text-center select-none"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Loading…
                  </p>
                )}
                {!loadingConns &&
                  data.connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="rounded-xl p-3.5"
                      style={{
                        background: "var(--surface-raised)",
                        border: `1px solid ${conn.isActive ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{
                              color: conn.isActive
                                ? "var(--text)"
                                : "var(--text-faint)",
                              fontSize: 10,
                            }}
                          >
                            {conn.isActive ? "●" : "○"}
                          </span>
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "var(--text)" }}
                          >
                            {conn.name}
                          </span>
                          <span
                            className="text-[10px] rounded px-1.5 py-0.5 select-none"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {DB_LABELS[conn.type]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeConn(conn.id)}
                          disabled={actionId === conn.id}
                          aria-label="Delete connection"
                          className="flex-shrink-0 p-0.5 rounded transition-opacity duration-150 hover:opacity-60"
                          style={{ color: "var(--text-faint)" }}
                        >
                          <XIcon />
                        </button>
                      </div>
                      <p
                        className="text-[11px] font-mono truncate mb-2.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {conn.connectionString}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {conn.isActive ? (
                          <OutlineBtn
                            onClick={() => deactivate(conn.id)}
                            disabled={actionId === conn.id}
                          >
                            {actionId === conn.id ? (
                              <>
                                <Spinner /> …
                              </>
                            ) : (
                              "Disconnect"
                            )}
                          </OutlineBtn>
                        ) : (
                          <PrimaryBtn
                            onClick={() => activate(conn.id)}
                            disabled={actionId === conn.id}
                          >
                            {actionId === conn.id ? (
                              <>
                                <Spinner /> …
                              </>
                            ) : (
                              "Use"
                            )}
                          </PrimaryBtn>
                        )}
                        <OutlineBtn
                          onClick={() => testExisting(conn.id)}
                          disabled={actionId === conn.id}
                        >
                          {actionId === conn.id ? (
                            <>
                              <Spinner /> …
                            </>
                          ) : (
                            "Test"
                          )}
                        </OutlineBtn>
                      </div>
                    </div>
                  ))}

                {/* Local JSON — always shown */}
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    background: "var(--surface-raised)",
                    border: `1px solid ${data.localIsActive ? "var(--border)" : "var(--border)"}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{
                        color: data.localIsActive
                          ? "var(--text)"
                          : "var(--text-faint)",
                        fontSize: 10,
                      }}
                    >
                      {data.localIsActive ? "●" : "○"}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      Local JSON
                    </span>
                    <span
                      className="text-[10px] rounded px-1.5 py-0.5 select-none"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      Built-in
                    </span>
                    {data.localIsActive && (
                      <span
                        className="text-[10px] select-none"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] font-mono"
                    style={{ color: "var(--text-faint)" }}
                  >
                    data/links.json · data/notes.json
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: "var(--border)" }} />

            {/* ══ REMOTE SERVER ══════════════════════════════════════════════ */}
            <div>
              <SectionLabel>Remote Server</SectionLabel>

              {/* Status */}
              <div className="flex items-start gap-2 mb-3 min-h-5">
                <span
                  className="mt-[3px] w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      remoteStatus === "connected"
                        ? "var(--text)"
                        : remoteStatus === "testing"
                          ? "#a3a3a3"
                          : remoteStatus === "error"
                            ? "#ef4444"
                            : "#d4d4d4",
                  }}
                />
                <span
                  key={remoteMsg}
                  className="text-xs animate-fade-in"
                  style={{ color: "var(--text-muted)" }}
                >
                  {remoteMsg || "Not connected"}
                </span>
              </div>

              {/* URL input */}
              <label
                className="block text-[11px] mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Server URL
              </label>
              <input
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="http://localhost:4000"
                disabled={remoteStatus === "connected"}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border mb-2.5 transition-all duration-200"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  opacity: remoteStatus === "connected" ? 0.5 : 1,
                  cursor: remoteStatus === "connected" ? "not-allowed" : "auto",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px var(--accent-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              <div className="flex gap-2 mb-3">
                {remoteStatus !== "connected" ? (
                  <>
                    <OutlineBtn
                      onClick={testRemote}
                      disabled={remoteStatus === "testing" || !remoteUrl.trim()}
                    >
                      {remoteStatus === "testing" ? (
                        <>
                          <Spinner /> Testing…
                        </>
                      ) : (
                        "Test"
                      )}
                    </OutlineBtn>
                    <PrimaryBtn
                      onClick={connectRemote}
                      disabled={remoteStatus === "testing" || !remoteUrl.trim()}
                    >
                      Connect
                    </PrimaryBtn>
                  </>
                ) : (
                  <>
                    <OutlineBtn onClick={disconnectRemote}>
                      Disconnect
                    </OutlineBtn>
                    <OutlineBtn
                      onClick={testRemote}
                      disabled={(remoteStatus as string) === "testing"}
                    >
                      {(remoteStatus as string) === "testing" ? (
                        <>
                          <Spinner /> …
                        </>
                      ) : (
                        "Test again"
                      )}
                    </OutlineBtn>
                  </>
                )}
              </div>

              <DashedBtn
                onClick={() =>
                  exportFile("/api/server-download", "shor-server.zip")
                }
                disabled={exporting === "shor-server.zip"}
              >
                {exporting === "shor-server.zip"
                  ? "Preparing…"
                  : "↓ Download Server Files (.zip)"}
              </DashedBtn>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: "var(--border)" }} />

            {/* ══ EXPORT ═════════════════════════════════════════════════════ */}
            <div>
              <SectionLabel>Export</SectionLabel>
              <div className="flex flex-col gap-2">
                <DashedBtn
                  onClick={() =>
                    exportFile(
                      savedRemote ? `${savedRemote}/api/db/export` : "/api/db",
                      "links.json",
                    )
                  }
                  disabled={!!exporting}
                >
                  ↓ links.json
                </DashedBtn>
                <DashedBtn
                  onClick={() =>
                    exportFile("/api/notes/export?format=json", "notes.json")
                  }
                  disabled={!!exporting}
                >
                  ↓ notes.json
                </DashedBtn>
                <DashedBtn
                  onClick={() =>
                    exportFile("/api/notes/export?format=md", "notes.md")
                  }
                  disabled={!!exporting}
                >
                  ↓ notes.md
                </DashedBtn>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: "var(--border)" }} />

            {/* ══ IMPORT ════════════════════════════════════════════════════ */}
            <div>
              <SectionLabel>Import to DB</SectionLabel>
              <div className="flex flex-col gap-2">
                {/* Links import */}
                <div>
                  <DashedBtn
                    onClick={() => linksImportRef.current?.click()}
                    disabled={!!importing}
                  >
                    {importing === "links"
                      ? "Importing…"
                      : "↑ Import links.json"}
                  </DashedBtn>
                  <input
                    ref={linksImportRef}
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={(e) => importFile(e, "links")}
                    aria-label="Import links JSON"
                  />
                </div>
                {/* Notes import */}
                <div>
                  <DashedBtn
                    onClick={() => notesImportRef.current?.click()}
                    disabled={!!importing}
                  >
                    {importing === "notes"
                      ? "Importing…"
                      : "↑ Import notes.json"}
                  </DashedBtn>
                  <input
                    ref={notesImportRef}
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={(e) => importFile(e, "notes")}
                    aria-label="Import notes JSON"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
