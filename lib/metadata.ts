import type { Metadata } from "next";

const LOCAL_DEV_URL = "http://localhost:5000";

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return LOCAL_DEV_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    LOCAL_DEV_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      return new URL(normalizeSiteUrl(candidate));
    } catch {
      continue;
    }
  }

  return new URL(LOCAL_DEV_URL);
}

type OgImageOptions = {
  badge?: string;
  description: string;
  eyebrow?: string;
  path?: string;
  title: string;
};

function limitText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function buildOgImageUrl({
  badge,
  description,
  eyebrow,
  path,
  title,
}: OgImageOptions): string {
  const params = new URLSearchParams({
    description: limitText(description, 180),
    title: limitText(title, 72),
  });

  if (eyebrow?.trim()) {
    params.set("eyebrow", limitText(eyebrow, 32));
  }

  if (path?.trim()) {
    params.set("path", limitText(path, 48));
  }

  if (badge?.trim()) {
    params.set("badge", limitText(badge, 28));
  }

  return `/api/og?${params.toString()}`;
}

type PageMetadataOptions = {
  badge?: string;
  description: string;
  eyebrow?: string;
  ogDescription?: string;
  ogTitle?: string;
  path?: string;
  robots?: Metadata["robots"];
  title: string;
};

export function createPageMetadata({
  badge,
  description,
  eyebrow = "Shor",
  ogDescription,
  ogTitle,
  path = "/",
  robots,
  title,
}: PageMetadataOptions): Metadata {
  const socialTitle = ogTitle ?? title;
  const socialDescription = ogDescription ?? description;
  const ogImage = buildOgImageUrl({
    badge,
    description: socialDescription,
    eyebrow,
    path,
    title: socialTitle,
  });

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: path,
      siteName: "Shor",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [ogImage],
    },
    ...(robots ? { robots } : {}),
  };
}
