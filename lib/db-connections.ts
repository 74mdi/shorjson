// lib/db-connections.ts
// Manages saved external database connection configurations.
// Configs are persisted in data/db-connections.json.

import fs from "fs";
import path from "path";

const DATA_DIR   = path.join(process.cwd(), "data");
const CONNS_FILE = path.join(DATA_DIR, "db-connections.json");

export type DbType = "mongodb" | "postgresql" | "mysql" | "sqlite" | "redis";

export interface DbConnection {
  id: string;
  name: string;
  type: DbType;
  connectionString: string;
  isActive: boolean;
  createdAt: string;
  lastTestedAt?: string;
  lastTestStatus?: "ok" | "error";
  lastTestMessage?: string;
}

export function readConnections(): DbConnection[] {
  if (!fs.existsSync(CONNS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONNS_FILE, "utf-8")) as DbConnection[];
  } catch {
    return [];
  }
}

export function writeConnections(conns: DbConnection[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONNS_FILE, JSON.stringify(conns, null, 2), "utf-8");
}

export function getActiveConnection(): DbConnection | null {
  return readConnections().find((c) => c.isActive) ?? null;
}

export function setActiveConnection(id: string | null): void {
  const conns = readConnections();
  conns.forEach((c) => { c.isActive = c.id === id; });
  writeConnections(conns);
}

export const PLACEHOLDER: Record<DbType, string> = {
  mongodb:    "mongodb://localhost:27017/mydb",
  postgresql: "postgresql://user:pass@localhost:5432/mydb",
  mysql:      "mysql://user:pass@localhost:3306/mydb",
  sqlite:     "/absolute/path/to/database.sqlite",
  redis:      "redis://localhost:6379",
};
