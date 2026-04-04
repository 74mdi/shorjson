// lib/config.ts
// Persists runtime configuration (e.g., remote server URL) in data/config.json.
// This allows the remote server URL to survive Next.js process restarts.

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "config.json");

interface AppConfig {
  remoteServerUrl?: string | null;
}

function read(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as AppConfig;
  } catch {
    return {};
  }
}

function write(c: AppConfig): void {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2));
  } catch {
    // Silently ignore on read-only filesystems (e.g. Vercel serverless).
    // Use the REMOTE_SERVER_URL environment variable instead.
  }
}

export function getRemoteServerUrl(): string | null {
  // Environment variable takes priority — used on Vercel and other cloud hosts
  const envUrl = process.env.REMOTE_SERVER_URL?.trim();
  if (envUrl) return envUrl;
  return read().remoteServerUrl ?? null;
}

export function setRemoteServerUrl(url: string | null): void {
  write({ ...read(), remoteServerUrl: url || null });
}
