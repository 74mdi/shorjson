import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function clampText(value: string | null, fallback: string, maxLength: number): string {
  const normalized = value?.trim().replace(/\s+/g, " ") || fallback;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const title = clampText(searchParams.get("title"), "koki", 72);
  const description = clampText(
    searchParams.get("description"),
    "A minimal private links and notes workspace.",
    180,
  );
  const eyebrow = clampText(searchParams.get("eyebrow"), "koki", 32);
  const path = clampText(searchParams.get("path"), "/", 48);
  const badge = searchParams.get("badge")
    ? clampText(searchParams.get("badge"), "", 28)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, rgba(236, 116, 42, 0.22), transparent 34%), linear-gradient(180deg, #111315 0%, #090a0c 100%)",
          color: "#f8fafc",
          padding: "58px 70px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "#f8fafc",
                color: "#090a0c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              K
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                }}
              >
                {eyebrow}
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                koki
              </div>
            </div>
          </div>

          {badge ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.72)",
                padding: "10px 20px",
                fontSize: 20,
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: "88%",
          }}
        >
          <div
            style={{
              fontSize: 78,
              lineHeight: 1,
              letterSpacing: "-0.06em",
              fontWeight: 800,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              color: "#cbd5e1",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(148, 163, 184, 0.14)",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#94a3b8",
            }}
          >
            Shared from koki
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#64748b",
            }}
          >
            {path}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
