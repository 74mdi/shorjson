// app/api/server-download/route.ts
// GET /api/server-download → streams a ZIP containing the standalone shor-server files

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

export async function GET() {
  const templateDir = path.join(process.cwd(), "server-template");

  // Read template files
  const files = ["server.js", "package.json", "README.md"];
  const zip = new JSZip();
  const folder = zip.folder("shor-server")!;

  for (const name of files) {
    const filePath = path.join(templateDir, name);
    if (fs.existsSync(filePath)) {
      folder.file(name, fs.readFileSync(filePath, "utf-8"));
    }
  }

  // Also add an empty links.json placeholder
  folder.file("links.json", JSON.stringify({}, null, 2));

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="shor-server.zip"',
    },
  });
}
