import type { CSSProperties } from "react";
import styles from "./PublicBioPage.module.css";
import type { BioPage } from "@/lib/bio-shared";

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48l-.01-1.69c-2.78.6-3.37-1.18-3.37-1.18-.46-1.14-1.11-1.44-1.11-1.44-.91-.61.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.1-4.55-4.92 0-1.09.39-1.98 1.03-2.68-.11-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.21 2.39.11 2.64.64.7 1.03 1.59 1.03 2.68 0 3.83-2.33 4.66-4.56 4.91.36.31.67.92.67 1.87l-.01 2.77c0 .26.18.57.69.47A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37a4 4 0 1 1-4.63-3.32A4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4.98 3.5A2.49 2.49 0 1 0 5 8.48 2.49 2.49 0 0 0 4.98 3.5ZM3 9h4v12H3Zm7 0h3.83v1.64h.05c.53-1 1.84-2.05 3.79-2.05C21.72 8.59 23 11 23 14.2V21h-4v-5.82c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V21h-4Z" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.5 7.2a3 3 0 0 0-2.1-2.12C19.54 4.5 12 4.5 12 4.5s-7.54 0-9.4.58A3 3 0 0 0 .5 7.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.12C4.46 19.5 12 19.5 12 19.5s7.54 0 9.4-.58a3 3 0 0 0 2.1-2.12A31.9 31.9 0 0 0 24 12a31.9 31.9 0 0 0-.5-4.8ZM9.75 15.52V8.48L15.75 12Z" />
    </svg>
  );
}

const iconMap: Record<string, () => JSX.Element> = {
  github: GithubIcon,
  globe: GlobeIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  mail: MailIcon,
  music: MusicIcon,
  youtube: YoutubeIcon,
};

function renderIcon(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const Icon = iconMap[normalizedValue];
  if (Icon) return <Icon />;

  return <span aria-hidden="true">{value || "🔗"}</span>;
}

function groupLinks(page: BioPage) {
  const sections = new Map<string, BioPage["links"]>();

  for (const link of page.links) {
    const key = link.section?.trim() || "main";
    const existing = sections.get(key) ?? [];
    existing.push(link);
    sections.set(key, existing);
  }

  return [...sections.entries()];
}

const PAGE_THEME_STYLES: Record<BioPage["themePreset"], Record<string, string>> = {
  mono: {
    "--page-bg": "#f5f5f4",
    "--page-surface": "#ffffff",
    "--page-border": "#e7e5e4",
    "--page-text": "#111111",
    "--page-muted": "#78716c",
    "--page-faint": "#a8a29e",
  },
  paper: {
    "--page-bg": "#f5f0e8",
    "--page-surface": "#faf8f4",
    "--page-border": "#e8e2d8",
    "--page-text": "#1c1916",
    "--page-muted": "#9c9488",
    "--page-faint": "#b8ae9e",
  },
  midnight: {
    "--page-bg": "#09111f",
    "--page-surface": "#0f1726",
    "--page-border": "#213047",
    "--page-text": "#f8fafc",
    "--page-muted": "#94a3b8",
    "--page-faint": "#64748b",
  },
  ocean: {
    "--page-bg": "#effcff",
    "--page-surface": "#ffffff",
    "--page-border": "#d7ecf1",
    "--page-text": "#0f172a",
    "--page-muted": "#4b5563",
    "--page-faint": "#94a3b8",
  },
  sunset: {
    "--page-bg": "#fff7ed",
    "--page-surface": "#ffffff",
    "--page-border": "#fed7aa",
    "--page-text": "#7c2d12",
    "--page-muted": "#b45309",
    "--page-faint": "#fdba74",
  },
};

const FONT_CLASS_NAMES: Record<BioPage["fontPreset"], string> = {
  sans: styles.fontSans,
  editorial: styles.fontEditorial,
  grotesk: styles.fontGrotesk,
  mono: styles.fontMono,
};

const MOTION_CLASS_NAMES: Record<BioPage["animationPreset"], string> = {
  morph: styles.motionMorph,
  fade: styles.motionFade,
  lift: styles.motionLift,
  drift: styles.motionDrift,
};

function getPageStyle(page: BioPage): CSSProperties {
  return {
    ["--accent" as string]: page.accentColor,
    ...PAGE_THEME_STYLES[page.themePreset],
  } as CSSProperties;
}

export default function PublicBioPage({
  page,
  preview = false,
}: {
  page: BioPage;
  preview?: boolean;
}) {
  const sections = groupLinks(page);
  const pageStyle = getPageStyle(page);
  const fontClassName = FONT_CLASS_NAMES[page.fontPreset];
  const motionClassName = MOTION_CLASS_NAMES[page.animationPreset];

  return (
    <div
      className={[
        styles.page,
        fontClassName,
        motionClassName,
        preview ? styles.previewMode : "",
      ].join(" ")}
      style={pageStyle}
    >
      <div className={styles.pageInner}>
        <header className={styles.hero}>
          {page.avatar ? (
            <img
              src={page.avatar}
              alt={`${page.displayName} avatar`}
              className={styles.avatar}
              decoding="async"
            />
          ) : (
            <div className={`${styles.avatar} ${styles.avatarFallback}`}>
              {page.displayName.slice(0, 1).toUpperCase() || "@"}
            </div>
          )}
          <h1 className={styles.displayName}>{page.displayName}</h1>
          <p className={styles.username}>@{page.username}</p>
          {page.bio ? <p className={styles.bio}>{page.bio}</p> : null}
        </header>

        <div className={styles.divider} />

        {sections.length === 0 ? (
          <p className={styles.emptyText}>No public links yet.</p>
        ) : (
          <div className={styles.sections}>
            {sections.map(([section, links]) => (
              <section key={section} className={styles.section}>
                {section !== "main" ? (
                  <div className={styles.sectionLabel}>{section}</div>
                ) : null}

                <div className={styles.links}>
                  {links.map((link, index) => (
                    <div
                      key={link.id}
                      className={styles.linkItem}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn-base btn-${page.buttonStyle} ${styles.linkAnchor}`}
                      >
                        <span className={styles.iconWrap}>{renderIcon(link.icon)}</span>
                        <span>{link.title}</span>
                        <span className={styles.arrow} aria-hidden="true">
                          →
                        </span>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className={styles.watermark}>{page.watermarkText}</footer>
      </div>
    </div>
  );
}
