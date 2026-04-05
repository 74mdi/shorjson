import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug    = searchParams.get("slug")   ?? "";
  const destUrl = searchParams.get("url")    ?? "";
  const clicks  = parseInt(searchParams.get("clicks") ?? "0", 10);

  // Truncate long URLs nicely
  function truncate(str: string, max: number) {
    if (!str) return "";
    try {
      const clean = str.replace(/^https?:\/\//, "");
      return clean.length > max ? clean.slice(0, max) + "…" : clean;
    } catch {
      return str.slice(0, max);
    }
  }

  const displayUrl   = truncate(destUrl, 52);
  const displaySlug  = `/${slug}`;
  const clickLabel   = clicks === 1 ? "1 click" : `${clicks} clicks`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "60px 72px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Top row — branding + click badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Shor wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                color: "#0a0a0a",
              }}
            >
              S
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>
              Shor
            </span>
          </div>

          {/* Click count badge */}
          {clicks > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: 100,
                border: "1px solid #2a2a2a",
                background: "#111111",
                color: "#737373",
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              {clickLabel}
            </div>
          )}
        </div>

        {/* Center — slug + destination */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Short slug */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            {displaySlug}
          </div>

          {/* Arrow + destination URL */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ color: "#404040", fontSize: 28 }}>→</div>
            <div
              style={{
                fontSize: 26,
                color: "#737373",
                fontWeight: 400,
                letterSpacing: "-0.2px",
              }}
            >
              {displayUrl}
            </div>
          </div>
        </div>

        {/* Bottom — subtle domain watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: "1px solid #1a1a1a",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 16, color: "#404040", fontWeight: 500 }}>
            Shared via Shor · Short link manager
          </div>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  );
}
