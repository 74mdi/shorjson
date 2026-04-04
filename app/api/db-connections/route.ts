// GET  /api/db-connections — list all saved connections (+ built-in local JSON)
// POST /api/db-connections — save a new connection config

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  readConnections, writeConnections,
  type DbConnection, type DbType,
} from "@/lib/db-connections";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<DbType>(["mongodb","postgresql","mysql","sqlite","redis"]);

export async function GET() {
  const conns   = readConnections();
  const hasActive = conns.some((c) => c.isActive);
  return NextResponse.json({
    connections: conns,
    localIsActive: !hasActive,  // local JSON is active when nothing else is
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const name             = String(body.name             ?? "").trim();
  const type             = String(body.type             ?? "") as DbType;
  const connectionString = String(body.connectionString ?? "").trim();

  if (!name)             return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid database type." }, { status: 400 });
  if (!connectionString) return NextResponse.json({ error: "Connection string is required." }, { status: 400 });

  const conn: DbConnection = {
    id: nanoid(7),
    name,
    type,
    connectionString,
    isActive:  false,
    createdAt: new Date().toISOString(),
  };

  const conns = readConnections();
  conns.push(conn);
  writeConnections(conns);
  return NextResponse.json(conn, { status: 201 });
}
