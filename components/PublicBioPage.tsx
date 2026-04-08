"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import styles from "./PublicBioPage.module.css";
import {
  getAccessibleTextColorForBackground,
  getButtonBlurValue,
  getButtonLabelStyleTokens,
  getPageWidthValue,
  type BioPage,
} from "@/lib/bio-shared";
import {
  getCurrentThemeMode,
  subscribeToThemeStore,
} from "@/lib/theme-client";

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

function FacebookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.2c0-.9.3-1.5 1.6-1.5H17V5c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3V11H8v3h2.4v8z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.3 4.4A17.4 17.4 0 0 0 16 3l-.2.4a12 12 0 0 1 3.6 1.7A13.8 13.8 0 0 0 12 3a13.7 13.7 0 0 0-7.4 2.1 12 12 0 0 1 3.7-1.7L8 3a17.4 17.4 0 0 0-4.3 1.4C1 8.3.2 12 1 15.7A17.7 17.7 0 0 0 6.3 18l1.1-1.8c-.6-.2-1.2-.6-1.7-1 2.1 1 4.1 1.5 6.3 1.5s4.2-.5 6.3-1.5c-.5.4-1.1.8-1.7 1l1.1 1.8A17.7 17.7 0 0 0 23 15.7c1-3.7.2-7.4-2.7-11.3ZM9.4 14.1c-.9 0-1.7-.9-1.7-2s.7-2 1.7-2c.9 0 1.7.9 1.7 2s-.8 2-1.7 2Zm5.2 0c-.9 0-1.7-.9-1.7-2s.7-2 1.7-2c.9 0 1.7.9 1.7 2s-.8 2-1.7 2Z" />
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

function SpotifyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.6 14.4a.8.8 0 0 1-1.1.3 9.9 9.9 0 0 0-8.3-.8.8.8 0 1 1-.5-1.5 11.5 11.5 0 0 1 9.7.9.8.8 0 0 1 .2 1.1Zm1.5-3a1 1 0 0 1-1.3.4 12.5 12.5 0 0 0-10.4-.9 1 1 0 1 1-.7-1.9 14.5 14.5 0 0 1 12 .9 1 1 0 0 1 .4 1.4Zm.1-3.1A15 15 0 0 0 5.4 9.2 1.1 1.1 0 1 1 4.8 7a17.2 17.2 0 0 1 14.7 1.3 1.1 1.1 0 1 1-1.1 2Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="m21.9 4.6-3 14.2c-.2 1-.8 1.2-1.6.8l-4.5-3.4-2.1 2.1c-.2.2-.4.4-.9.4l.3-4.7 8.6-7.8c.4-.3-.1-.5-.5-.2L7.5 12.7l-4.6-1.4c-1-.3-1-1 .2-1.5L20.7 3c.8-.3 1.5.2 1.2 1.6Z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.3 11.4c-.2-.1-.4-.2-.7-.3-.1-1.4-.5-2.5-1.3-3.3-.9-.9-2.1-1.4-3.7-1.4-3.1 0-5.3 2.1-5.3 5.1 0 3.5 2.5 6.1 6.2 6.1 3 0 5.1-1.7 5.1-4.2 0-1.1-.4-1.7-1.3-2Zm-4.7 5c-2.4 0-4.1-1.7-4.1-4 0-2.2 1.5-3.7 3.6-3.7 1.7 0 2.8.8 3 2.3-.8-.1-1.6-.2-2.6-.1-2.4.1-3.8 1.1-3.8 2.8 0 1.4 1.1 2.5 2.8 2.5 1.2 0 2.3-.5 3.1-1.6-.4 1.1-1.4 1.8-2.9 1.8Zm1.7-3.5c-.5.9-1.4 1.4-2.3 1.4-.8 0-1.3-.4-1.3-1 0-.8.6-1.3 2.2-1.4.5 0 1 0 1.6.1 0 .3-.1.6-.2.9Z" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 3h18v11l-4 4h-4l-2 2H8v-2H3V3Zm2 2v11h4v2l2-2h4l3-3V5H5Zm5 2h2v5h-2V7Zm5 0h2v5h-2V7Z" />
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

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.1l-4.77-6.79L6.2 22H3.08l7.24-8.27L1 2h6.25l4.31 6.14z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 3c.27 2.17 1.67 4.24 4 5.2V11a8 8 0 0 1-4-1.12V15.4a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6.02.9.08v2.73a2.8 2.8 0 1 0 1.9 2.67V3z" />
    </svg>
  );
}

const iconMap: Record<string, () => JSX.Element> = {
  discord: DiscordIcon,
  facebook: FacebookIcon,
  github: GithubIcon,
  globe: GlobeIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  mail: MailIcon,
  music: MusicIcon,
  spotify: SpotifyIcon,
  telegram: TelegramIcon,
  tiktok: TiktokIcon,
  threads: ThreadsIcon,
  twitch: TwitchIcon,
  x: XIcon,
  youtube: YoutubeIcon,
};

function renderIcon(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const Icon = iconMap[normalizedValue];
  if (Icon) return <Icon />;

  return <span aria-hidden="true">{value || "🔗"}</span>;
}

function getResolvedIconColor(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  return !normalizedValue || normalizedValue === "#1c1916"
    ? "currentColor"
    : value;
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

function capitalizeToken(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function getModuleClassName(prefix: string, value: string): string {
  return styles[`${prefix}${value.split("-").map(capitalizeToken).join("")}`] ?? "";
}

type ThemeTokens = {
  bg: string;
  border: string;
  faint: string;
  muted: string;
  surface: string;
  text: string;
};

const PAGE_THEME_STYLES: Record<
  BioPage["themePreset"],
  { dark: ThemeTokens; light: ThemeTokens }
> = {
  mono: {
    light: {
      bg: "#f5f5f4",
      surface: "#ffffff",
      border: "#e7e5e4",
      text: "#111111",
      muted: "#78716c",
      faint: "#a8a29e",
    },
    dark: {
      bg: "#080808",
      surface: "#141414",
      border: "#27272a",
      text: "#fafafa",
      muted: "#a1a1aa",
      faint: "#52525b",
    },
  },
  paper: {
    light: {
      bg: "#f5f0e8",
      surface: "#faf8f4",
      border: "#e8e2d8",
      text: "#1c1916",
      muted: "#9c9488",
      faint: "#b8ae9e",
    },
    dark: {
      bg: "#16110d",
      surface: "#221a14",
      border: "#3a2f28",
      text: "#f7efe4",
      muted: "#c8b8a5",
      faint: "#7a685b",
    },
  },
  midnight: {
    light: {
      bg: "#eff4ff",
      surface: "#ffffff",
      border: "#d9e4ff",
      text: "#0f172a",
      muted: "#475569",
      faint: "#94a3b8",
    },
    dark: {
      bg: "#09111f",
      surface: "#0f1726",
      border: "#213047",
      text: "#f8fafc",
      muted: "#94a3b8",
      faint: "#64748b",
    },
  },
  ocean: {
    light: {
      bg: "#effcff",
      surface: "#ffffff",
      border: "#d7ecf1",
      text: "#0f172a",
      muted: "#4b5563",
      faint: "#94a3b8",
    },
    dark: {
      bg: "#071a20",
      surface: "#0d252d",
      border: "#1d414c",
      text: "#ecfeff",
      muted: "#9bd5df",
      faint: "#4e7d89",
    },
  },
  sunset: {
    light: {
      bg: "#fff7ed",
      surface: "#ffffff",
      border: "#fed7aa",
      text: "#7c2d12",
      muted: "#b45309",
      faint: "#fdba74",
    },
    dark: {
      bg: "#22110b",
      surface: "#30160d",
      border: "#66301b",
      text: "#fff2e8",
      muted: "#fdba74",
      faint: "#8f5438",
    },
  },
  forest: {
    light: {
      bg: "#eff6f0",
      surface: "#f8fcf8",
      border: "#d5e6d7",
      text: "#15261a",
      muted: "#5f7a67",
      faint: "#9bb3a1",
    },
    dark: {
      bg: "#0b1510",
      surface: "#112017",
      border: "#213b29",
      text: "#eefcf2",
      muted: "#9ac6a4",
      faint: "#53745c",
    },
  },
  graphite: {
    light: {
      bg: "#eceef2",
      surface: "#f8f9fb",
      border: "#d5dae3",
      text: "#171b24",
      muted: "#677287",
      faint: "#9ca3b2",
    },
    dark: {
      bg: "#0f1218",
      surface: "#161b23",
      border: "#2a3340",
      text: "#f5f7fb",
      muted: "#a6b0c2",
      faint: "#596375",
    },
  },
  rose: {
    light: {
      bg: "#fff1f5",
      surface: "#ffffff",
      border: "#fecdd3",
      text: "#831843",
      muted: "#be185d",
      faint: "#f9a8d4",
    },
    dark: {
      bg: "#231017",
      surface: "#31141f",
      border: "#6b2742",
      text: "#fff1f7",
      muted: "#f9a8d4",
      faint: "#9a4c69",
    },
  },
  citrus: {
    light: {
      bg: "#fffbea",
      surface: "#ffffff",
      border: "#fde68a",
      text: "#713f12",
      muted: "#a16207",
      faint: "#fcd34d",
    },
    dark: {
      bg: "#1f1706",
      surface: "#2c2209",
      border: "#5d4c12",
      text: "#fff8db",
      muted: "#facc15",
      faint: "#8d7424",
    },
  },
  violet: {
    light: {
      bg: "#f5f3ff",
      surface: "#ffffff",
      border: "#ddd6fe",
      text: "#4c1d95",
      muted: "#7c3aed",
      faint: "#c4b5fd",
    },
    dark: {
      bg: "#160f2d",
      surface: "#21163d",
      border: "#4c2f79",
      text: "#f5f3ff",
      muted: "#c4b5fd",
      faint: "#7f67ac",
    },
  },
  terminal: {
    light: {
      bg: "#edfdf4",
      surface: "#f9fffb",
      border: "#bbf7d0",
      text: "#14532d",
      muted: "#15803d",
      faint: "#86efac",
    },
    dark: {
      bg: "#08110a",
      surface: "#0d190f",
      border: "#1f3f26",
      text: "#dcfce7",
      muted: "#86efac",
      faint: "#4e7f59",
    },
  },
  porcelain: {
    light: {
      bg: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",
      text: "#0f172a",
      muted: "#64748b",
      faint: "#cbd5e1",
    },
    dark: {
      bg: "#111827",
      surface: "#172033",
      border: "#2f3a51",
      text: "#f8fafc",
      muted: "#cbd5e1",
      faint: "#64748b",
    },
  },
  ember: {
    light: {
      bg: "#fff1eb",
      surface: "#ffffff",
      border: "#fdc7b5",
      text: "#7c2d12",
      muted: "#c2410c",
      faint: "#f5a48a",
    },
    dark: {
      bg: "#26110d",
      surface: "#341510",
      border: "#6f2d20",
      text: "#fff1ea",
      muted: "#fdba74",
      faint: "#9d5848",
    },
  },
  mint: {
    light: {
      bg: "#ecfdf5",
      surface: "#ffffff",
      border: "#bbf7d0",
      text: "#14532d",
      muted: "#059669",
      faint: "#86efac",
    },
    dark: {
      bg: "#081611",
      surface: "#10211a",
      border: "#214d38",
      text: "#ecfdf5",
      muted: "#6ee7b7",
      faint: "#3f7e63",
    },
  },
  berry: {
    light: {
      bg: "#fff1f9",
      surface: "#ffffff",
      border: "#f5c2e7",
      text: "#701a75",
      muted: "#a21caf",
      faint: "#e879f9",
    },
    dark: {
      bg: "#1e0f22",
      surface: "#2b1331",
      border: "#5a2d63",
      text: "#fdf4ff",
      muted: "#f0abfc",
      faint: "#87508f",
    },
  },
  sand: {
    light: {
      bg: "#faf5ef",
      surface: "#ffffff",
      border: "#e7d8c5",
      text: "#453126",
      muted: "#8b6b52",
      faint: "#c8ad91",
    },
    dark: {
      bg: "#1a1510",
      surface: "#231b15",
      border: "#4a392a",
      text: "#f8efe6",
      muted: "#d1bca4",
      faint: "#7e6754",
    },
  },
  lagoon: {
    light: {
      bg: "#effcff",
      surface: "#ffffff",
      border: "#b7edf2",
      text: "#134e4a",
      muted: "#0f766e",
      faint: "#67e8f9",
    },
    dark: {
      bg: "#081618",
      surface: "#0f2226",
      border: "#23515b",
      text: "#ecfeff",
      muted: "#67e8f9",
      faint: "#4d7f89",
    },
  },
  aurora: {
    light: {
      bg: "#f4f3ff",
      surface: "#ffffff",
      border: "#d8d4fe",
      text: "#312e81",
      muted: "#6d28d9",
      faint: "#a78bfa",
    },
    dark: {
      bg: "#13142b",
      surface: "#1a1f39",
      border: "#3e4581",
      text: "#f5f3ff",
      muted: "#c4b5fd",
      faint: "#6e73b2",
    },
  },
  ink: {
    light: {
      bg: "#eef2ff",
      surface: "#ffffff",
      border: "#c7d2fe",
      text: "#172554",
      muted: "#4338ca",
      faint: "#93c5fd",
    },
    dark: {
      bg: "#070d19",
      surface: "#0e1728",
      border: "#24365a",
      text: "#eff6ff",
      muted: "#93c5fd",
      faint: "#5874a8",
    },
  },
  gold: {
    light: {
      bg: "#fffbea",
      surface: "#ffffff",
      border: "#fcd34d",
      text: "#713f12",
      muted: "#b45309",
      faint: "#fbbf24",
    },
    dark: {
      bg: "#191307",
      surface: "#241b0a",
      border: "#574213",
      text: "#fffbeb",
      muted: "#fcd34d",
      faint: "#8d7424",
    },
  },
  pearl: {
    light: {
      bg: "#f8f8ff",
      surface: "#ffffff",
      border: "#dfe1ff",
      text: "#202248",
      muted: "#6366f1",
      faint: "#a5abff",
    },
    dark: {
      bg: "#121424",
      surface: "#191c31",
      border: "#343a63",
      text: "#f7f7ff",
      muted: "#b7bcff",
      faint: "#666da6",
    },
  },
  spruce: {
    light: {
      bg: "#eef7f3",
      surface: "#fbfffd",
      border: "#cde5dc",
      text: "#17342f",
      muted: "#0f766e",
      faint: "#84b7a7",
    },
    dark: {
      bg: "#0c1613",
      surface: "#10211d",
      border: "#245148",
      text: "#ecfdf8",
      muted: "#7dd3c7",
      faint: "#4a7e71",
    },
  },
  coral: {
    light: {
      bg: "#fff4f1",
      surface: "#ffffff",
      border: "#ffd2c7",
      text: "#7c2d12",
      muted: "#ea580c",
      faint: "#f7a68c",
    },
    dark: {
      bg: "#231310",
      surface: "#321814",
      border: "#6f3527",
      text: "#fff2ed",
      muted: "#fdba74",
      faint: "#a86553",
    },
  },
};

const BUTTON_SIZE_CLASS_NAMES: Record<BioPage["buttonSize"], string> = {
  compact: "btn-size-compact",
  balanced: "btn-size-balanced",
  roomy: "btn-size-roomy",
};

function getPageStyle(
  page: BioPage,
  mode: "dark" | "light",
): CSSProperties {
  const accentColor = /^#[0-9a-f]{6}$/i.test(page.accentColor)
    ? page.accentColor
    : "#d97b4a";
  const theme = PAGE_THEME_STYLES[page.themePreset][mode];
  const labelTokens = getButtonLabelStyleTokens(page.buttonLabelStyle);

  return {
    ["--accent" as string]: accentColor,
    ["--accent-contrast" as string]:
      getAccessibleTextColorForBackground(accentColor),
    ["--page-bg" as string]: theme.bg,
    ["--page-surface" as string]: theme.surface,
    ["--page-border" as string]: theme.border,
    ["--page-text" as string]: theme.text,
    ["--page-muted" as string]: theme.muted,
    ["--page-faint" as string]: theme.faint,
    ["--bio-button-blur" as string]: getButtonBlurValue(page.buttonBlur),
    ["--bio-page-width" as string]: getPageWidthValue(page.pageWidth),
    ["--bio-button-text-transform" as string]: labelTokens.textTransform,
    ["--bio-button-letter-spacing" as string]: labelTokens.letterSpacing,
  } as CSSProperties;
}

function getFontClassName(fontPreset: BioPage["fontPreset"]): string {
  switch (fontPreset) {
    case "sans":
      return styles.fontSans;
    case "editorial":
      return styles.fontEditorial;
    case "grotesk":
      return styles.fontGrotesk;
    case "mono":
      return styles.fontMono;
    case "sora":
      return styles.fontSora;
    case "fraunces":
      return styles.fontFraunces;
    case "outfit":
      return styles.fontOutfit;
    case "ibm":
      return styles.fontIbm;
    case "newsreader":
      return styles.fontNewsreader;
    case "syne":
      return styles.fontSyne;
    default: {
      const [body, heading] = fontPreset.split("-");
      return [
        getModuleClassName("fontBody", body),
        getModuleClassName("fontHeading", heading),
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
}

function getMotionClassName(animationPreset: BioPage["animationPreset"]): string {
  switch (animationPreset) {
    case "morph":
      return `${styles.motionBaseMorph} ${styles.motionToneSmooth}`;
    case "fade":
      return `${styles.motionBaseFade} ${styles.motionToneSoft}`;
    case "lift":
      return `${styles.motionBaseLift} ${styles.motionToneCrisp}`;
    case "drift":
      return `${styles.motionBaseDrift} ${styles.motionToneCinematic}`;
    default: {
      const [tone, base] = animationPreset.split("-");
      return [
        getModuleClassName("motionBase", base),
        getModuleClassName("motionTone", tone),
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
}

export default function PublicBioPage({
  page,
  preview = false,
}: {
  page: BioPage;
  preview?: boolean;
}) {
  const documentColorMode = useSyncExternalStore<"dark" | "light">(
    subscribeToThemeStore,
    getCurrentThemeMode,
    () => "light",
  );
  const [colorModeOverride, setColorModeOverride] = useState<
    "dark" | "light" | null
  >(null);
  const colorMode = colorModeOverride ?? documentColorMode;
  const sections = groupLinks(page);
  const fontClassName = getFontClassName(page.fontPreset);
  const motionClassName = getMotionClassName(page.animationPreset);
  const backgroundClassName = getModuleClassName(
    "background",
    page.backgroundStyle,
  );
  const buttonSizeClassName = BUTTON_SIZE_CLASS_NAMES[page.buttonSize];
  const pageStyle = useMemo(() => getPageStyle(page, colorMode), [colorMode, page]);

  return (
    <div
      className={[
        styles.page,
        fontClassName,
        motionClassName,
        backgroundClassName,
        preview ? styles.previewMode : "",
      ].join(" ")}
      style={pageStyle}
    >
      <div className={styles.pageInner}>
        <header className={styles.hero}>
          {page.showThemeToggle ? (
            <button
              type="button"
              className={styles.themeToggle}
              onClick={() =>
                setColorModeOverride((value): "dark" | "light" =>
                  (value ?? documentColorMode) === "dark" ? "light" : "dark",
                )
              }
            >
              {colorMode === "dark" ? "Light" : "Dark"}
            </button>
          ) : null}
          {page.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
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
                        className={`btn-base ${buttonSizeClassName} btn-${page.buttonStyle} ${styles.linkAnchor}`}
                      >
                        <span
                          className={styles.iconWrap}
                          style={{
                            color: getResolvedIconColor(link.iconColor),
                          }}
                        >
                          {renderIcon(link.icon)}
                        </span>
                        <span className={styles.linkLabel}>{link.title}</span>
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
