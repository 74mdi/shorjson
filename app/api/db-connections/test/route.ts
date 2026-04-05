// POST /api/db-connections/test
// Tests a connection string without saving it.
// Body: { type: DbType, connectionString: string }

import { NextRequest, NextResponse } from "next/server";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originError = verifySameOrigin(req);
  if (originError) return originError;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const type = String(body.type ?? "");
  const cs   = String(body.connectionString ?? "").trim();
  if (!cs) return NextResponse.json({ error: "Connection string required." }, { status: 400 });

  try {
    switch (type) {
      case "mongodb": {
        const { MongoClient } = await import("mongodb").catch(() => {
          throw new Error("Run: npm install mongodb");
        });
        const client = new MongoClient(cs, { serverSelectionTimeoutMS: 5000 });
        try {
          await client.connect();
          await client.db().command({ ping: 1 });
          const info = await client.db().command({ buildInfo: 1 }) as { version: string };
          return NextResponse.json({ ok: true, message: `MongoDB ${info.version} — connected ✓` });
        } finally {
          await client.close().catch(() => {});
        }
      }

      case "postgresql": {
        const pg = await import("pg").catch(() => { throw new Error("Run: npm install pg"); });
        const Pool: typeof import("pg").Pool =
          (pg as unknown as { default?: { Pool: typeof import("pg").Pool } }).default?.Pool ?? pg.Pool;
        const pool = new Pool({ connectionString: cs, connectionTimeoutMillis: 5000 });
        try {
          const { rows } = await pool.query("SELECT version()");
          const ver = String(rows[0]?.version ?? "").split(" ").slice(0,2).join(" ");
          return NextResponse.json({ ok: true, message: `${ver} — connected ✓` });
        } finally {
          await pool.end().catch(() => {});
        }
      }

      case "mysql":
        return NextResponse.json({ ok: false, message: "MySQL requires: npm install mysql2" }, { status: 400 });
      case "sqlite":
        return NextResponse.json({ ok: false, message: "SQLite requires: npm install better-sqlite3" }, { status: 400 });
      case "redis":
        return NextResponse.json({ ok: false, message: "Redis requires: npm install ioredis" }, { status: 400 });
      default:
        return NextResponse.json({ error: "Unknown type." }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
