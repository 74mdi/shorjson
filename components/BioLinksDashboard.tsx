"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PublicBioPage from "./PublicBioPage";
import styles from "./BioLinksDashboard.module.css";
import {
  bioLinkCreateSchema,
  bioProfileSchema,
  bioStyleSchema,
  USERNAME_PATTERN,
} from "@/lib/schemas";
import {
  ANIMATION_PRESETS,
  buildBioPageData,
  getAccessibleTextColorForBackground,
  getButtonBlurValue,
  getButtonLabelStyleTokens,
  getPageWidthValue,
  BUTTON_STYLES,
  FONT_PRESETS,
  getPublicBioPath,
  getAnimationPresetLabel,
  getAnimationPresetPreview,
  getFontPresetLabel,
  getFontPresetPreview,
  type AnimationPreset,
  type BackgroundStyle,
  type BioPage,
  type ButtonBlur,
  type ButtonLabelStyle,
  type ButtonSize,
  type ButtonStyle,
  type FontPreset,
  type PageWidth,
  type ThemePreset,
} from "@/lib/bio-shared";

type EditorTab = "profile" | "links" | "style";
type SaveState = "idle" | "saving" | "saved" | "error";

type DashboardProfile = {
  accentColor: string;
  avatar: string | null;
  bio: string;
  buttonStyle: ButtonStyle;
  displayName: string;
  fontPreset: FontPreset;
  id: string;
  animationPreset: AnimationPreset;
  backgroundStyle: BackgroundStyle;
  buttonSize: ButtonSize;
  buttonBlur: ButtonBlur;
  pageWidth: PageWidth;
  buttonLabelStyle: ButtonLabelStyle;
  themePreset: ThemePreset;
  updatedAt: string;
  userId: string;
  username: string;
  watermarkText: string;
  showThemeToggle: boolean;
};

type DashboardLink = {
  id: string;
  createdAt: string;
  icon: string;
  iconColor: string;
  order: number;
  profileId: string;
  section: string;
  title: string;
  url: string;
  userId: string;
  visible: boolean;
};

type StyleTemplate = {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  settings: Pick<
    DashboardProfile,
    | "animationPreset"
    | "backgroundStyle"
    | "buttonBlur"
    | "buttonLabelStyle"
    | "buttonSize"
    | "buttonStyle"
    | "fontPreset"
    | "pageWidth"
    | "themePreset"
  >;
};

const STYLE_OPTIONS: readonly ButtonStyle[] = BUTTON_STYLES;

const COLOR_PRESETS = [
  "#d97b4a",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#3b82f6",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#7c3aed",
  "#a855f7",
  "#d946ef",
  "#f43f5e",
  "#ec4899",
  "#be123c",
  "#c2410c",
  "#166534",
  "#155e75",
  "#1d4ed8",
  "#4338ca",
  "#581c87",
  "#7f1d1d",
  "#78350f",
  "#1c1916",
  "#111827",
  "#334155",
  "#6b7280",
  "#0f172a",
];

const THEME_OPTIONS: Array<{
  accentColor: string;
  description: string;
  id: ThemePreset;
  label: string;
}> = [
  {
    id: "mono",
    label: "Mono",
    accentColor: "#0a0a0a",
    description: "Sharp monochrome with quiet contrast.",
  },
  {
    id: "paper",
    label: "Paper",
    accentColor: "#9a6b42",
    description: "Soft editorial neutrals with a warmer accent.",
  },
  {
    id: "midnight",
    label: "Midnight",
    accentColor: "#93c5fd",
    description: "Dark glassy canvas with cool edges.",
  },
  {
    id: "ocean",
    label: "Ocean",
    accentColor: "#06b6d4",
    description: "Muted blue-green palette with airy contrast.",
  },
  {
    id: "sunset",
    label: "Sunset",
    accentColor: "#f97316",
    description: "Warm blush palette for brighter pages.",
  },
  {
    id: "forest",
    label: "Forest",
    accentColor: "#2f855a",
    description: "Quiet green neutrals with a soft natural edge.",
  },
  {
    id: "graphite",
    label: "Graphite",
    accentColor: "#334155",
    description: "Cool editorial gray with sharper contrast.",
  },
  {
    id: "rose",
    label: "Rose",
    accentColor: "#e11d48",
    description: "Soft pink editorial palette with stronger highlights.",
  },
  {
    id: "citrus",
    label: "Citrus",
    accentColor: "#d97706",
    description: "Bright lemon-paper tones with warm contrast.",
  },
  {
    id: "violet",
    label: "Violet",
    accentColor: "#7c3aed",
    description: "Rich purple palette that stays readable in both modes.",
  },
  {
    id: "terminal",
    label: "Terminal",
    accentColor: "#22c55e",
    description: "Green-leaning interface with a crisp dark version.",
  },
  {
    id: "porcelain",
    label: "Porcelain",
    accentColor: "#2563eb",
    description: "Cool clean white-blue system with sharp contrast.",
  },
  {
    id: "ember",
    label: "Ember",
    accentColor: "#ea580c",
    description: "Smoky red-orange palette with warmer dark mode.",
  },
  {
    id: "mint",
    label: "Mint",
    accentColor: "#10b981",
    description: "Fresh green tones with a glassier feel.",
  },
  {
    id: "berry",
    label: "Berry",
    accentColor: "#c026d3",
    description: "Deep berry color with lighter pastel edges.",
  },
  {
    id: "sand",
    label: "Sand",
    accentColor: "#b08968",
    description: "Warm neutrals with softer contrast for calmer pages.",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    accentColor: "#0f766e",
    description: "Tropical teal palette with a cleaner cyan dark mode.",
  },
  {
    id: "aurora",
    label: "Aurora",
    accentColor: "#7c3aed",
    description: "Luminous violet-blue tones with more atmosphere.",
  },
  {
    id: "ink",
    label: "Ink",
    accentColor: "#1d4ed8",
    description: "Sharper editorial navy palette for high contrast pages.",
  },
  {
    id: "gold",
    label: "Gold",
    accentColor: "#d97706",
    description: "Warm golden paper palette with richer shadows.",
  },
  {
    id: "pearl",
    label: "Pearl",
    accentColor: "#6366f1",
    description: "Soft pearl neutrals with a cleaner lilac accent.",
  },
  {
    id: "spruce",
    label: "Spruce",
    accentColor: "#0f766e",
    description: "Deep pine greens with calmer cool contrast.",
  },
  {
    id: "coral",
    label: "Coral",
    accentColor: "#f97316",
    description: "Fresh coral warmth with brighter light mode cards.",
  },
];

const FONT_OPTIONS = FONT_PRESETS.map((id) => ({
  id,
  label: getFontPresetLabel(id),
  preview: getFontPresetPreview(id),
}));

const ANIMATION_OPTIONS = ANIMATION_PRESETS.map((id) => ({
  id,
  label: getAnimationPresetLabel(id),
  preview: getAnimationPresetPreview(id),
}));

const BACKGROUND_OPTIONS: Array<{
  id: BackgroundStyle;
  label: string;
  preview: string;
}> = [
  { id: "plain", label: "Plain", preview: "No texture, just the palette" },
  { id: "grid", label: "Grid", preview: "Fine editorial grid lines" },
  { id: "dots", label: "Dots", preview: "Soft dotted field" },
  { id: "mesh", label: "Mesh", preview: "Blurred glow clusters" },
  { id: "grain", label: "Grain", preview: "Quiet textured wash" },
  { id: "stripes", label: "Stripes", preview: "Diagonal stripe rhythm" },
  { id: "spotlight", label: "Spotlight", preview: "Soft halo behind the hero" },
  { id: "waves", label: "Waves", preview: "Repeating curved rhythm" },
  { id: "plaid", label: "Plaid", preview: "Crossed editorial lines" },
  { id: "halo", label: "Halo", preview: "Corner glows and softer depth" },
  { id: "constellation", label: "Constellation", preview: "Tiny star points with faint joins" },
  { id: "linen", label: "Linen", preview: "Layered fabric-like cross texture" },
  { id: "radial", label: "Radial", preview: "Big soft color wells across the canvas" },
];

const BUTTON_SIZE_OPTIONS: Array<{
  id: ButtonSize;
  label: string;
  preview: string;
}> = [
  { id: "compact", label: "Compact", preview: "Tighter links for dense stacks" },
  { id: "balanced", label: "Balanced", preview: "The default all-round size" },
  { id: "roomy", label: "Roomy", preview: "More breathing room and weight" },
];

const BUTTON_BLUR_OPTIONS: Array<{
  id: ButtonBlur;
  label: string;
  preview: string;
}> = [
  { id: "none", label: "No blur", preview: "Keeps glass styles crisp and flat." },
  { id: "soft", label: "Soft blur", preview: "Balanced depth for blur, frost, and cloud buttons." },
  { id: "strong", label: "Strong blur", preview: "A glassier surface with heavier diffusion." },
];

const PAGE_WIDTH_OPTIONS: Array<{
  id: PageWidth;
  label: string;
  preview: string;
}> = [
  { id: "narrow", label: "Narrow", preview: "Tighter reading column with smaller reach." },
  { id: "standard", label: "Standard", preview: "Balanced width for most bio pages." },
  { id: "wide", label: "Wide", preview: "Broader cards with more breathing room." },
];

const BUTTON_LABEL_STYLE_OPTIONS: Array<{
  id: ButtonLabelStyle;
  label: string;
  preview: string;
}> = [
  { id: "normal", label: "Normal", preview: "Natural button labels with default casing." },
  { id: "uppercase", label: "Uppercase", preview: "Sharper editorial buttons with stronger presence." },
  { id: "spaced", label: "Spaced", preview: "More tracking without forcing all-caps." },
];

const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "minimal-studio",
    label: "Minimal Studio",
    description: "Quiet monochrome with clean spacing and almost no noise.",
    accentColor: "#0a0a0a",
    settings: {
      animationPreset: "fade",
      backgroundStyle: "plain",
      buttonBlur: "none",
      buttonLabelStyle: "normal",
      buttonSize: "balanced",
      buttonStyle: "quiet",
      fontPreset: "sans",
      pageWidth: "standard",
      themePreset: "mono",
    },
  },
  {
    id: "paper-journal",
    label: "Paper Journal",
    description: "Soft editorial warmth with calmer cards and serif energy.",
    accentColor: "#9a6b42",
    settings: {
      animationPreset: "soft-lift",
      backgroundStyle: "linen",
      buttonBlur: "none",
      buttonLabelStyle: "normal",
      buttonSize: "balanced",
      buttonStyle: "outline-pill",
      fontPreset: "editorial",
      pageWidth: "standard",
      themePreset: "paper",
    },
  },
  {
    id: "midnight-glass",
    label: "Midnight Glass",
    description: "Darker glassy surface with a cleaner tech-leaning tone.",
    accentColor: "#93c5fd",
    settings: {
      animationPreset: "smooth-glide",
      backgroundStyle: "halo",
      buttonBlur: "strong",
      buttonLabelStyle: "normal",
      buttonSize: "balanced",
      buttonStyle: "glass",
      fontPreset: "sora",
      pageWidth: "standard",
      themePreset: "midnight",
    },
  },
  {
    id: "mono-poster",
    label: "Mono Poster",
    description: "Tighter layout with sharper type and stronger structure.",
    accentColor: "#334155",
    settings: {
      animationPreset: "crisp-lift",
      backgroundStyle: "grid",
      buttonBlur: "none",
      buttonLabelStyle: "uppercase",
      buttonSize: "compact",
      buttonStyle: "mono",
      fontPreset: "mono",
      pageWidth: "narrow",
      themePreset: "graphite",
    },
  },
  {
    id: "warm-creator",
    label: "Warm Creator",
    description: "Brighter, roomier, and a little more expressive without feeling busy.",
    accentColor: "#f97316",
    settings: {
      animationPreset: "soft-breeze",
      backgroundStyle: "radial",
      buttonBlur: "soft",
      buttonLabelStyle: "normal",
      buttonSize: "roomy",
      buttonStyle: "soft",
      fontPreset: "outfit",
      pageWidth: "wide",
      themePreset: "sunset",
    },
  },
];

const COMMON_EMOJIS = [
  "🔗",
  "✨",
  "🎵",
  "🎥",
  "📚",
  "💌",
  "🛍️",
  "🎨",
  "📰",
  "📷",
  "🎙️",
  "🧠",
  "🌐",
  "💼",
  "🪄",
  "🧩",
  "🎯",
  "☕",
  "💬",
  "🕊️",
  "⚡",
  "🔥",
  "📺",
  "🎧",
  "💡",
  "🫶",
  "📩",
  "🛠️",
  "🎁",
  "🌻",
];

const ICON_CHOICES = [
  { label: "Link", value: "🔗" },
  { label: "Facebook", value: "facebook" },
  { label: "Discord", value: "discord" },
  { label: "GitHub", value: "github" },
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Mail", value: "mail" },
  { label: "Website", value: "globe" },
  { label: "Music", value: "music" },
  { label: "Spotify", value: "spotify" },
  { label: "Telegram", value: "telegram" },
  { label: "Threads", value: "threads" },
  { label: "Twitch", value: "twitch" },
  { label: "X", value: "x" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
];

const ICON_COLOR_PRESETS = [
  "#1c1916",
  "#ffffff",
  "#d97b4a",
  "#1877f2",
  "#3b82f6",
  "#10b981",
  "#1db954",
  "#8b5cf6",
  "#5865f2",
  "#f43f5e",
  "#e4405f",
  "#06b6d4",
  "#f59e0b",
  "#ff0000",
];

function getSafeHexColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function formatStyleLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function clearTimerRef(
  ref: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (!ref.current) return;
  clearTimeout(ref.current);
  ref.current = null;
}

function clearOptionalTimerRef(ref: MutableRefObject<number | null>) {
  if (ref.current === null) return;
  clearTimeout(ref.current);
  ref.current = null;
}

function clearTimerMap(timers: Record<string, ReturnType<typeof setTimeout>>) {
  Object.values(timers).forEach((timer) => clearTimeout(timer));
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
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
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.94 7.23 7.62 4 12 4s8.06 3.23 9.94 7.65a1 1 0 0 1 0 .7C20.06 16.77 16.38 20 12 20s-8.06-3.23-9.94-7.65Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
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
      <path d="m2 2 20 20" />
      <path d="M6.71 6.71A9.94 9.94 0 0 0 2.06 12.35a1 1 0 0 0 0 .7C3.94 17.47 7.62 20.7 12 20.7c1.79 0 3.49-.42 5-1.16" />
      <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c4.38 0 8.06 3.23 9.94 7.65a1 1 0 0 1 0 .7 12.5 12.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function DuplicateIcon() {
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
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SortableLinkItem({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={styles.linkItem}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label="Reorder link"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {children}
    </div>
  );
}

export default function BioLinksDashboard({
  csrfToken,
  initialLinks,
  initialProfile,
}: {
  csrfToken: string;
  initialLinks: DashboardLink[];
  initialProfile: DashboardProfile;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const [activeTab, setActiveTab] = useState<EditorTab>("profile");
  const [compactPreviewMode, setCompactPreviewMode] = useState<"edit" | "preview">(
    "edit",
  );
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState("");

  const [profile, setProfile] = useState(initialProfile);
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({});
  const [profileSaveState, setProfileSaveState] = useState<SaveState>("idle");
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [links, setLinks] = useState(
    [...initialLinks].sort((left, right) => left.order - right.order),
  );
  const [linksError, setLinksError] = useState("");
  const [linksSaveState, setLinksSaveState] = useState<SaveState>("idle");
  const [styleSaveState, setStyleSaveState] = useState<SaveState>("idle");

  const [newLink, setNewLink] = useState({
    icon: "🔗",
    iconColor: "#1c1916",
    section: "main",
    title: "",
    url: "",
  });
  const [newLinkErrors, setNewLinkErrors] = useState<Record<string, string[]>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [activeSectionFilter, setActiveSectionFilter] = useState("all");

  const emojiPopoverRef = useRef<HTMLDivElement>(null);
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileSavePromiseRef = useRef<Promise<void> | null>(null);
  const styleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styleStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLinkPatchesRef = useRef<Record<string, Partial<DashboardLink>>>({});
  const linkTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedProfileRef = useRef(initialProfile);
  const copiedPublicLinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
    const media = window.matchMedia("(max-width: 767px)");
    const applyViewport = () => setIsCompactViewport(media.matches);
    applyViewport();
    media.addEventListener("change", applyViewport);

    return () => {
      media.removeEventListener("change", applyViewport);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (profile.username === lastSavedProfileRef.current.username) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }

    if (!USERNAME_PATTERN.test(profile.username)) {
      setUsernameAvailable(false);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/check-username?u=${encodeURIComponent(profile.username)}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => ({}))) as {
          available?: boolean;
        };
        setUsernameAvailable(Boolean(data.available));
      } catch {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [profile.username]);

  useEffect(() => {
    return () => {
      clearTimerRef(profileSaveTimerRef);
      clearTimerRef(profileStatusTimerRef);
      clearTimerRef(styleSaveTimerRef);
      clearTimerRef(styleStatusTimerRef);
      clearTimerMap(linkTimersRef.current);
      linkTimersRef.current = {};
      clearOptionalTimerRef(copiedPublicLinkTimeoutRef);
    };
  }, []);

  const deferredProfile = useDeferredValue(profile);
  const deferredLinks = useDeferredValue(links);
  const deferredLinkSearch = useDeferredValue(linkSearch);
  const previewPage = useMemo<BioPage>(() => {
    return buildBioPageData(deferredProfile, deferredLinks);
  }, [deferredLinks, deferredProfile]);
  const stylePreviewVariables = useMemo(() => {
    const accentColor = getSafeHexColor(profile.accentColor, "#d97b4a");
    const labelTokens = getButtonLabelStyleTokens(profile.buttonLabelStyle);

    return {
      ["--accent" as string]: accentColor,
      ["--accent-contrast" as string]:
        getAccessibleTextColorForBackground(accentColor),
      ["--accent-hover" as string]:
        "color-mix(in srgb, var(--accent) 82%, var(--text) 18%)",
      ["--accent-soft" as string]:
        "color-mix(in srgb, var(--accent) 10%, transparent)",
      ["--accent-soft-border" as string]:
        "color-mix(in srgb, var(--accent) 26%, var(--border))",
      ["--bio-button-blur" as string]:
        getButtonBlurValue(profile.buttonBlur),
      ["--bio-button-text-transform" as string]:
        labelTokens.textTransform,
      ["--bio-button-letter-spacing" as string]:
        labelTokens.letterSpacing,
      ["--bio-page-width" as string]:
        getPageWidthValue(profile.pageWidth),
    } as React.CSSProperties;
  }, [
    profile.buttonBlur,
    profile.buttonLabelStyle,
    profile.pageWidth,
    profile.accentColor,
  ]);
  const publicPath = getPublicBioPath(profile.username || "username");
  const publicUrl = siteOrigin ? `${siteOrigin}${publicPath}` : publicPath;
  const sectionOptions = useMemo(() => {
    return [...new Set(links.map((link) => link.section.trim() || "main"))].sort(
      (left, right) => {
        if (left === "main") return -1;
        if (right === "main") return 1;
        return left.localeCompare(right);
      },
    );
  }, [links]);
  const totalLinks = links.length;
  const visibleLinksCount = useMemo(
    () => links.filter((link) => link.visible).length,
    [links],
  );
  const hiddenLinksCount = totalLinks - visibleLinksCount;
  const filteredLinks = useMemo(() => {
    const search = deferredLinkSearch.trim().toLowerCase();

    return links.filter((link) => {
      const section = link.section.trim() || "main";
      if (activeSectionFilter !== "all" && section !== activeSectionFilter) {
        return false;
      }

      if (!search) return true;

      return [link.title, link.url, section, link.icon].some((value) =>
        value.toLowerCase().includes(search),
      );
    });
  }, [activeSectionFilter, deferredLinkSearch, links]);
  const hasLinkFilters =
    activeSectionFilter !== "all" || deferredLinkSearch.trim().length > 0;
  const currentTheme = THEME_OPTIONS.find(
    (theme) => theme.id === profile.themePreset,
  );
  const currentTemplateId =
    STYLE_TEMPLATES.find((template) => {
      return (
        profile.accentColor === template.accentColor &&
        profile.animationPreset === template.settings.animationPreset &&
        profile.backgroundStyle === template.settings.backgroundStyle &&
        profile.buttonBlur === template.settings.buttonBlur &&
        profile.buttonLabelStyle === template.settings.buttonLabelStyle &&
        profile.buttonSize === template.settings.buttonSize &&
        profile.buttonStyle === template.settings.buttonStyle &&
        profile.fontPreset === template.settings.fontPreset &&
        profile.pageWidth === template.settings.pageWidth &&
        profile.themePreset === template.settings.themePreset
      );
    })?.id ?? null;

  useEffect(() => {
    if (activeSectionFilter === "all") return;
    if (sectionOptions.includes(activeSectionFilter)) return;
    setActiveSectionFilter("all");
  }, [activeSectionFilter, sectionOptions]);

  function markSaved(setter: (value: SaveState) => void, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    setter("saved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setter("idle"), 1500);
  }

  function queueProfileSave(nextProfile = profile) {
    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
    }

    profileSaveTimerRef.current = setTimeout(() => {
      void persistProfile(nextProfile);
    }, 600);
  }

  async function persistProfile(nextProfile = profile) {
    const parsed = bioProfileSchema.safeParse(nextProfile);
    if (!parsed.success) {
      setProfileErrors(parsed.error.flatten().fieldErrors);
      setProfileSaveState("error");
      return;
    }

    if (
      !checkingUsername &&
      !usernameAvailable &&
      nextProfile.username !== lastSavedProfileRef.current.username
    ) {
      setProfileErrors((current) => ({
        ...current,
        username: ["That username is already taken."],
      }));
      setProfileSaveState("error");
      return;
    }

    setProfileSaveState("saving");
    setProfileErrors({});

    const savePromise = (async () => {
      const response = await fetch("/api/bio/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => ({}))) as
        | DashboardProfile
        | { error?: string; fieldErrors?: Record<string, string[]> };

      if (!response.ok) {
        setProfileSaveState("error");
        setProfileErrors(
          "fieldErrors" in data && data.fieldErrors ? data.fieldErrors : {},
        );
        return;
      }

      const updatedProfile = data as DashboardProfile;
      setProfile(updatedProfile);
      lastSavedProfileRef.current = updatedProfile;
      markSaved(setProfileSaveState, profileStatusTimerRef);
    })().catch(() => {
      setProfileSaveState("error");
    });

    profileSavePromiseRef.current = savePromise;
    await savePromise;
  }

  function buildStylePayload(nextProfile = profile) {
    return {
      accentColor: nextProfile.accentColor,
      animationPreset: nextProfile.animationPreset,
      backgroundStyle: nextProfile.backgroundStyle,
      buttonStyle: nextProfile.buttonStyle,
      buttonSize: nextProfile.buttonSize,
      buttonBlur: nextProfile.buttonBlur,
      pageWidth: nextProfile.pageWidth,
      buttonLabelStyle: nextProfile.buttonLabelStyle,
      fontPreset: nextProfile.fontPreset,
      themePreset: nextProfile.themePreset,
      watermarkText: "made with koki",
      showThemeToggle: nextProfile.showThemeToggle,
    };
  }

  function queueStyleSave(nextStyle = buildStylePayload()) {
    if (styleSaveTimerRef.current) {
      clearTimeout(styleSaveTimerRef.current);
    }

    styleSaveTimerRef.current = setTimeout(async () => {
      const parsed = bioStyleSchema.safeParse(nextStyle);
      if (!parsed.success) {
        setStyleSaveState("error");
        return;
      }

      setStyleSaveState("saving");

      try {
        const response = await fetch("/api/bio/style", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(parsed.data),
        });

        if (!response.ok) {
          setStyleSaveState("error");
          return;
        }

        markSaved(setStyleSaveState, styleStatusTimerRef);
      } catch {
        setStyleSaveState("error");
      }
    }, 240);
  }

  function queueLinkPatch(linkId: string, patch: Partial<DashboardLink>) {
    pendingLinkPatchesRef.current[linkId] = {
      ...(pendingLinkPatchesRef.current[linkId] ?? {}),
      ...patch,
    };

    if (linkTimersRef.current[linkId]) {
      clearTimeout(linkTimersRef.current[linkId]);
    }

    linkTimersRef.current[linkId] = setTimeout(async () => {
      const nextPatch = pendingLinkPatchesRef.current[linkId];
      delete pendingLinkPatchesRef.current[linkId];
      delete linkTimersRef.current[linkId];
      if (!nextPatch) return;

      setLinksSaveState("saving");

      try {
        const response = await fetch(`/api/links/${encodeURIComponent(linkId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(nextPatch),
        });
        const data = (await response.json().catch(() => ({}))) as
          | DashboardLink
          | { error?: string };

        if (!response.ok) {
          setLinksError(("error" in data && data.error) || "Unable to save link.");
          setLinksSaveState("error");
          return;
        }

        const savedLink = data as DashboardLink;
        setLinks((current) =>
          [...current]
            .map((link) => (link.id === savedLink.id ? savedLink : link))
            .sort((left, right) => left.order - right.order),
        );
        setLinksError("");
        setLinksSaveState("saved");
        window.setTimeout(() => setLinksSaveState("idle"), 1200);
      } catch {
        setLinksError("Unable to save link.");
        setLinksSaveState("error");
      }
    }, 420);
  }

  async function handleAddLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = bioLinkCreateSchema.safeParse({
      icon: newLink.icon,
      iconColor: newLink.iconColor,
      section: newLink.section,
      title: newLink.title,
      url: newLink.url,
      visible: true,
    });

    if (!parsed.success) {
      setNewLinkErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setLinksSaveState("saving");
    setNewLinkErrors({});

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => ({}))) as
        | DashboardLink
        | { error?: string; fieldErrors?: Record<string, string[]> };

      if (!response.ok) {
        setLinksError(("error" in data && data.error) || "Unable to create link.");
        setNewLinkErrors(
          "fieldErrors" in data && data.fieldErrors ? data.fieldErrors : {},
        );
        setLinksSaveState("error");
        return;
      }

      setLinks((current) =>
        [...current, data as DashboardLink].sort(
          (left, right) => left.order - right.order,
        ),
      );
      setLinksError("");
      setNewLink({
        icon: "🔗",
        iconColor: "#1c1916",
        section: "main",
        title: "",
        url: "",
      });
      setShowEmojiPicker(false);
      markSaved(setLinksSaveState, { current: null });
    } catch {
      setLinksError("Unable to create link.");
      setLinksSaveState("error");
    }
  }

  async function handleDeleteLink(linkId: string) {
    const previousLinks = links;
    setLinks((current) => current.filter((link) => link.id !== linkId));
    setLinksSaveState("saving");

    try {
      const response = await fetch(`/api/links/${encodeURIComponent(linkId)}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken },
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setLinks(previousLinks);
        setLinksError(data.error ?? "Unable to delete link.");
        setLinksSaveState("error");
        return;
      }

      markSaved(setLinksSaveState, { current: null });
    } catch {
      setLinks(previousLinks);
      setLinksError("Unable to delete link.");
      setLinksSaveState("error");
    }
  }

  function updateLinkLocally(linkId: string, patch: Partial<DashboardLink>) {
    setLinks((current) =>
      current.map((link) =>
        link.id === linkId
          ? {
              ...link,
              ...patch,
            }
          : link,
      ),
    );
    queueLinkPatch(linkId, patch);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(links, oldIndex, newIndex).map((link, index) => ({
      ...link,
      order: index,
    }));

    setLinks(reordered);
    reordered.forEach((link) => {
      queueLinkPatch(link.id, { order: link.order });
    });
  }

  async function handleCopyPublicLink() {
    await copyToClipboard(publicUrl);
    setCopiedPublicLink(true);
    if (copiedPublicLinkTimeoutRef.current) {
      clearTimeout(copiedPublicLinkTimeoutRef.current);
    }
    copiedPublicLinkTimeoutRef.current = window.setTimeout(() => {
      setCopiedPublicLink(false);
    }, 1800);
  }

  function handleSetAllLinksVisible(visible: boolean) {
    const linkIdsToUpdate = links
      .filter((link) => link.visible !== visible)
      .map((link) => link.id);

    if (linkIdsToUpdate.length === 0) return;

    setLinks((current) =>
      current.map((link) =>
        linkIdsToUpdate.includes(link.id)
          ? {
              ...link,
              visible,
            }
          : link,
      ),
    );
    setLinksError("");
    setLinksSaveState("saving");
    linkIdsToUpdate.forEach((linkId) => {
      queueLinkPatch(linkId, { visible });
    });
  }

  async function handleDuplicateLink(link: DashboardLink) {
    const parsed = bioLinkCreateSchema.safeParse({
      icon: link.icon,
      iconColor: link.iconColor,
      section: link.section,
      title: `${link.title} copy`,
      url: link.url,
      visible: link.visible,
    });

    if (!parsed.success) {
      setLinksError("Unable to duplicate link.");
      setLinksSaveState("error");
      return;
    }

    setLinksError("");
    setLinksSaveState("saving");

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => ({}))) as
        | DashboardLink
        | { error?: string };

      if (!response.ok) {
        setLinksError(("error" in data && data.error) || "Unable to duplicate link.");
        setLinksSaveState("error");
        return;
      }

      setLinks((current) =>
        [...current, data as DashboardLink].sort(
          (left, right) => left.order - right.order,
        ),
      );
      markSaved(setLinksSaveState, { current: null });
    } catch {
      setLinksError("Unable to duplicate link.");
      setLinksSaveState("error");
    }
  }

  function applyStyleTemplate(template: StyleTemplate) {
    const nextProfile = {
      ...profile,
      ...template.settings,
      accentColor: template.accentColor,
    };
    setProfile(nextProfile);
    queueStyleSave(buildStylePayload(nextProfile));
  }

  const saveStatusTone =
    profileSaveState === "error" ||
    linksSaveState === "error" ||
    styleSaveState === "error"
      ? "error"
      : profileSaveState === "saving" ||
          linksSaveState === "saving" ||
          styleSaveState === "saving"
        ? "saving"
        : profileSaveState === "saved" ||
            linksSaveState === "saved" ||
            styleSaveState === "saved"
          ? "saved"
          : "idle";

  const saveStatusLabel =
    saveStatusTone === "error"
      ? "Save failed"
      : saveStatusTone === "saving"
        ? "Saving changes"
        : saveStatusTone === "saved"
          ? "All changes saved"
          : "Autosave on";

  function renderLinkCard(link: DashboardLink, sortable: boolean) {
    const content = (
      <>
        {!sortable ? <div className={styles.dragPlaceholder}>·</div> : null}

        <div className={styles.iconEditor}>
          <input
            className={styles.inlineInput}
            value={link.icon}
            maxLength={20}
            onChange={(event) =>
              updateLinkLocally(link.id, {
                icon: event.target.value || "🔗",
              })
            }
          />
          <select
            className={styles.selectInput}
            value={
              ICON_CHOICES.some((option) => option.value === link.icon)
                ? link.icon
                : "custom"
            }
            onChange={(event) => {
              if (event.target.value === "custom") return;
              updateLinkLocally(link.id, {
                icon: event.target.value,
              });
            }}
          >
            {ICON_CHOICES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom emoji</option>
          </select>
        </div>

        <div className={styles.linkFields}>
          <div className={styles.linkTopRow}>
            <input
              className={styles.inlineInput}
              value={link.title}
              onChange={(event) =>
                updateLinkLocally(link.id, {
                  title: event.target.value,
                })
              }
            />
            <input
              className={styles.chipInput}
              value={link.section}
              onChange={(event) =>
                updateLinkLocally(link.id, {
                  section: event.target.value || "main",
                })
              }
            />
          </div>

          <div className={styles.linkBottomRow}>
            <input
              className={styles.inlineInput}
              value={link.url}
              onChange={(event) =>
                updateLinkLocally(link.id, {
                  url: event.target.value,
                })
              }
            />
            <div className={styles.urlPreview}>
              {link.visible ? "Visible on page" : "Hidden from page"}
            </div>
          </div>

          <div className={styles.colorPickerRow}>
            <div className={styles.linkColorsRow}>
              {ICON_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorDot} ${
                    link.iconColor === color ? styles.colorDotActive : ""
                  }`}
                  style={{ background: color }}
                  onClick={() =>
                    updateLinkLocally(link.id, {
                      iconColor: color,
                    })
                  }
                />
              ))}
            </div>
            <input
              type="color"
              aria-label="Choose link icon color"
              className={styles.nativeColorInput}
              value={getSafeHexColor(link.iconColor, "#1c1916")}
              onChange={(event) =>
                updateLinkLocally(link.id, {
                  iconColor: event.target.value.toLowerCase(),
                })
              }
            />
          </div>
        </div>

        <div className={styles.linkActions}>
          <button
            type="button"
            className={styles.actionIconButton}
            onClick={() => void handleDuplicateLink(link)}
            aria-label="Duplicate link"
          >
            <DuplicateIcon />
          </button>

          <button
            type="button"
            className={`${styles.toggleButton} ${
              link.visible ? styles.toggleButtonActive : ""
            }`}
            onClick={() =>
              updateLinkLocally(link.id, {
                visible: !link.visible,
              })
            }
            aria-label={link.visible ? "Hide link" : "Show link"}
          >
            <EyeIcon open={link.visible} />
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => void handleDeleteLink(link.id)}
            aria-label="Delete link"
          >
            <TrashIcon />
          </button>
        </div>
      </>
    );

    if (sortable) {
      return (
        <div key={link.id} className={link.visible ? "" : styles.linkItemHidden}>
          <SortableLinkItem id={link.id}>{content}</SortableLinkItem>
        </div>
      );
    }

    return (
      <div
        key={link.id}
        className={`${styles.linkItem} ${link.visible ? "" : styles.linkItemHidden}`}
      >
        {content}
      </div>
    );
  }

  const currentThemeLabel =
    currentTheme?.label ?? formatStyleLabel(profile.themePreset);
  const compactPreviewLabel = compactPreviewMode === "edit" ? "Preview" : "Edit";

  return (
    <main className={styles.workspace}>
      <div className={styles.mobileSwitch}>
        <button
          type="button"
          className={`${styles.tabButton} ${
            compactPreviewMode === "edit" ? styles.tabButtonActive : ""
          }`}
          onClick={() => setCompactPreviewMode("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${
            compactPreviewMode === "preview" ? styles.tabButtonActive : ""
          }`}
          onClick={() => setCompactPreviewMode("preview")}
        >
          Preview
        </button>
      </div>

      <div className={styles.layout}>
        <section
          className={[
            styles.panel,
            styles.editorPanel,
            isCompactViewport && compactPreviewMode === "preview"
              ? styles.mobileHidden
              : "",
          ].join(" ")}
        >
          <header className={styles.editorHeader}>
            <div className={styles.heroTop}>
              <div className={styles.titleGroup}>
                <div className={styles.eyebrow}>Dashboard / Bio editor</div>
                <h1>Shape your page</h1>
                <p>
                  A simpler editing space for your profile, links, and style.
                  Every change saves automatically while the preview stays live.
                </p>
              </div>
              <div className={styles.heroActions}>
                <div
                  className={`${styles.statusPill} ${
                    saveStatusTone === "saving"
                      ? styles.statusPillSaving
                      : saveStatusTone === "saved"
                        ? styles.statusPillSaved
                        : saveStatusTone === "error"
                          ? styles.statusPillError
                          : ""
                  } ${
                    saveStatusTone === "saving" ? styles.statusSaving : ""
                  }`}
                >
                  {saveStatusLabel}
                </div>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setActiveTab("links")}
                  >
                    Add links
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void handleCopyPublicLink()}
                  >
                    {copiedPublicLink ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      window.open(publicPath, "_blank", "noopener,noreferrer")
                    }
                  >
                    Open page
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Links</span>
                <strong className={styles.statValue}>{totalLinks}</strong>
                <span className={styles.statMeta}>
                  {visibleLinksCount} live, {hiddenLinksCount} hidden
                </span>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Sections</span>
                <strong className={styles.statValue}>{sectionOptions.length}</strong>
                <span className={styles.statMeta}>
                  Filter and organize your stack faster
                </span>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Theme</span>
                <strong className={styles.statValue}>{currentThemeLabel}</strong>
                <span className={styles.statMeta}>
                  {formatStyleLabel(profile.buttonStyle)} buttons
                </span>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Public URL</span>
                <strong className={styles.statValue}>@{profile.username}</strong>
                <span className={styles.statMeta}>{publicPath}</span>
              </div>
            </div>

            <div className={styles.tabs}>
              {(["profile", "links", "style"] as EditorTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.tabButton} ${
                    activeTab === tab ? styles.tabButtonActive : ""
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "links" ? `links (${totalLinks})` : tab}
                </button>
              ))}
            </div>
          </header>

          <div className={styles.editorBody}>
            {activeTab === "profile" ? (
              <div className={styles.sectionStack}>
                <div className={styles.contentGrid}>
                  <section className={styles.surfaceCard}>
                    <div className={styles.surfaceHeader}>
                      <div>
                        <div className={styles.surfaceEyebrow}>Profile</div>
                        <h2>Identity and intro</h2>
                        <p>
                          Keep this part tight and readable so the public page feels
                          polished immediately.
                        </p>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <label className={styles.fieldGroup}>
                        <span className={styles.label}>Display name</span>
                        <input
                          className={styles.input}
                          maxLength={60}
                          value={profile.displayName}
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              displayName: event.target.value,
                            }))
                          }
                          onBlur={() => queueProfileSave()}
                        />
                        <span className={styles.fieldError}>
                          {profileErrors.displayName?.[0] ?? ""}
                        </span>
                      </label>

                      <label className={styles.fieldGroup}>
                        <span className={styles.label}>Username</span>
                        <input
                          className={styles.input}
                          maxLength={20}
                          value={profile.username}
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              username: event.target.value.toLowerCase(),
                            }))
                          }
                          onBlur={() => queueProfileSave()}
                        />
                        <div className={styles.fieldMeta}>
                          <span className={styles.fieldHint}>
                            {siteOrigin
                              ? `${siteOrigin}${getPublicBioPath(profile.username || "username")}`
                              : getPublicBioPath(profile.username || "username")}
                          </span>
                          <span className={styles.fieldHint}>
                            {checkingUsername
                              ? "checking..."
                              : usernameAvailable
                                ? "available"
                                : "taken"}
                          </span>
                        </div>
                        <span className={styles.fieldError}>
                          {profileErrors.username?.[0] ??
                            (!usernameAvailable
                              ? "That username is already taken."
                              : "")}
                        </span>
                      </label>
                    </div>

                    <label className={styles.fieldGroup}>
                      <span className={styles.label}>Bio</span>
                      <textarea
                        className={styles.textarea}
                        maxLength={160}
                        value={profile.bio}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            bio: event.target.value,
                          }))
                        }
                        onBlur={() => queueProfileSave()}
                      />
                      <div className={styles.fieldMeta}>
                        <span className={styles.fieldError}>
                          {profileErrors.bio?.[0] ?? ""}
                        </span>
                        <span className={styles.fieldHint}>
                          {profile.bio.length}/160
                        </span>
                      </div>
                    </label>
                  </section>

                  <div className={styles.sidebarStack}>
                    <section className={styles.surfaceCard}>
                      <div className={styles.surfaceHeader}>
                        <div>
                          <div className={styles.surfaceEyebrow}>Avatar</div>
                          <h2>Profile image</h2>
                          <p>
                            A clean headshot or mark makes the page feel finished
                            fast.
                          </p>
                        </div>
                      </div>

                      <div className={styles.avatarRow}>
                        {profile.avatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={profile.avatar}
                            alt="Current avatar"
                            className={styles.avatarPreview}
                          />
                        ) : (
                          <div
                            className={`${styles.avatarPreview} ${styles.avatarFallback}`}
                          >
                            {profile.displayName.slice(0, 1).toUpperCase() ||
                              profile.username.slice(0, 1).toUpperCase() ||
                              "@"}
                          </div>
                        )}

                        <div className={styles.avatarControls}>
                          <label className={styles.secondaryButton}>
                            Upload image
                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = () => {
                                  const value =
                                    typeof reader.result === "string"
                                      ? reader.result
                                      : null;
                                  if (!value) return;

                                  const nextProfile = {
                                    ...profile,
                                    avatar: value,
                                  };
                                  setProfile(nextProfile);
                                  queueProfileSave(nextProfile);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>

                          {profile.avatar ? (
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => {
                                const nextProfile = {
                                  ...profile,
                                  avatar: null,
                                };
                                setProfile(nextProfile);
                                queueProfileSave(nextProfile);
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <span className={styles.fieldError}>
                        {profileErrors.avatar?.[0] ?? ""}
                      </span>
                    </section>

                    <section className={styles.surfaceCard}>
                      <div className={styles.surfaceHeader}>
                        <div>
                          <div className={styles.surfaceEyebrow}>Sharing</div>
                          <h2>Public page</h2>
                          <p>
                            Jump to your live page, copy the link, or switch into
                            link and style editing quickly.
                          </p>
                        </div>
                        <span className={styles.profileChip}>@{profile.username}</span>
                      </div>

                      <div className={styles.publicUrlCard}>
                        <span className={styles.publicUrlValue}>{publicUrl}</span>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => void handleCopyPublicLink()}
                        >
                          {copiedPublicLink ? "Copied" : "Copy link"}
                        </button>
                      </div>

                      <div className={styles.inlineMetaChips}>
                        <span className={styles.metaChip}>{currentThemeLabel}</span>
                        <span className={styles.metaChip}>
                          {formatStyleLabel(profile.buttonStyle)}
                        </span>
                        <span className={styles.metaChip}>
                          {profile.showThemeToggle ? "Theme switch on" : "Theme switch off"}
                        </span>
                      </div>

                      <div className={styles.profileActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() =>
                            window.open(publicPath, "_blank", "noopener,noreferrer")
                          }
                        >
                          Open page
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setActiveTab("links")}
                        >
                          Edit links
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setActiveTab("style")}
                        >
                          Style page
                        </button>
                        <Link href="/user" className={styles.secondaryButton}>
                          User page
                        </Link>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "links" ? (
              <div className={styles.sectionStack}>
                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Composer</div>
                      <h2>Add a new link</h2>
                      <p>
                        Drop in the next destination, label it clearly, and slot it
                        into the right section from the start.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={(event) => void handleAddLink(event)}>
                    <div className={styles.addGrid}>
                      <div className={styles.emojiWrap} ref={emojiPopoverRef}>
                        <button
                          type="button"
                          className={styles.iconTrigger}
                          onClick={() => setShowEmojiPicker((value) => !value)}
                          aria-label="Choose link emoji"
                        >
                          {newLink.icon}
                        </button>
                        {showEmojiPicker ? (
                          <div className={styles.emojiPopover}>
                            {COMMON_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className={styles.emojiButton}
                                onClick={() => {
                                  setNewLink((current) => ({
                                    ...current,
                                    icon: emoji,
                                  }));
                                  setShowEmojiPicker(false);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <select
                        className={styles.selectInput}
                        value={
                          ICON_CHOICES.some((option) => option.value === newLink.icon)
                            ? newLink.icon
                            : "custom"
                        }
                        onChange={(event) => {
                          if (event.target.value === "custom") return;
                          setNewLink((current) => ({
                            ...current,
                            icon: event.target.value,
                          }));
                        }}
                      >
                        {ICON_CHOICES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        <option value="custom">Custom emoji</option>
                      </select>

                      <input
                        className={styles.input}
                        placeholder="Title"
                        value={newLink.title}
                        onChange={(event) =>
                          setNewLink((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />

                      <input
                        className={styles.input}
                        placeholder="Section"
                        value={newLink.section}
                        onChange={(event) =>
                          setNewLink((current) => ({
                            ...current,
                            section: event.target.value,
                          }))
                        }
                      />

                      <input
                        className={styles.input}
                        placeholder="https://example.com"
                        value={newLink.url}
                        onChange={(event) =>
                          setNewLink((current) => ({
                            ...current,
                            url: event.target.value,
                          }))
                        }
                      />

                      <button type="submit" className={styles.addButton}>
                        + Add
                      </button>
                    </div>

                    <div className={styles.colorPickerRow}>
                      <div className={styles.linkColorsRow}>
                        {ICON_COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`${styles.colorDot} ${
                              newLink.iconColor === color ? styles.colorDotActive : ""
                            }`}
                            style={{ background: color }}
                            onClick={() =>
                              setNewLink((current) => ({
                                ...current,
                                iconColor: color,
                              }))
                            }
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        aria-label="Choose icon color"
                        className={styles.nativeColorInput}
                        value={getSafeHexColor(newLink.iconColor, "#1c1916")}
                        onChange={(event) =>
                          setNewLink((current) => ({
                            ...current,
                            iconColor: event.target.value.toLowerCase(),
                          }))
                        }
                      />
                    </div>

                    <div className={styles.fieldMeta}>
                      <span className={styles.fieldError}>
                        {newLinkErrors.title?.[0] ||
                          newLinkErrors.url?.[0] ||
                          newLinkErrors.icon?.[0] ||
                          newLinkErrors.iconColor?.[0] ||
                          newLinkErrors.section?.[0] ||
                          ""}
                      </span>
                      <span className={styles.fieldHint}>
                        Starts in {newLink.section.trim() || "main"}
                      </span>
                    </div>
                  </form>
                </section>

                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Manager</div>
                      <h2>Edit, filter, and reorder</h2>
                      <p>
                        Search links, filter by section, duplicate fast, and bulk
                        hide or reveal the whole stack.
                      </p>
                    </div>
                  </div>

                  <div className={styles.toolbarRow}>
                    <label className={styles.searchField}>
                      <span className={styles.label}>Search links</span>
                      <input
                        className={styles.input}
                        placeholder="Search by title, URL, section, or icon"
                        value={linkSearch}
                        onChange={(event) => setLinkSearch(event.target.value)}
                      />
                    </label>

                    <div className={styles.toolbarActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleSetAllLinksVisible(true)}
                        disabled={hiddenLinksCount === 0}
                      >
                        Show all
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleSetAllLinksVisible(false)}
                        disabled={visibleLinksCount === 0}
                      >
                        Hide all
                      </button>
                      {hasLinkFilters ? (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => {
                            setLinkSearch("");
                            setActiveSectionFilter("all");
                          }}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.filterRow}>
                    <button
                      type="button"
                      className={`${styles.filterChip} ${
                        activeSectionFilter === "all" ? styles.filterChipActive : ""
                      }`}
                      onClick={() => setActiveSectionFilter("all")}
                    >
                      All sections
                    </button>
                    {sectionOptions.map((section) => (
                      <button
                        key={section}
                        type="button"
                        className={`${styles.filterChip} ${
                          activeSectionFilter === section
                            ? styles.filterChipActive
                            : ""
                        }`}
                        onClick={() => setActiveSectionFilter(section)}
                      >
                        {section}
                      </button>
                    ))}
                  </div>

                  <div className={styles.panelNote}>
                    {hasLinkFilters
                      ? `${filteredLinks.length} matching links. Reordering is paused while filters are active.`
                      : "Drag links to reorder them. Duplicate any item when you want a fast variation."}
                  </div>

                  <div className={styles.listCard}>
                    {filteredLinks.length === 0 ? (
                      <div className={styles.emptyState}>
                        <h3>No matching links</h3>
                        <p>
                          Clear the search or switch sections to see the rest of
                          your stack again.
                        </p>
                      </div>
                    ) : hasLinkFilters ? (
                      filteredLinks.map((link) => renderLinkCard(link, false))
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => void handleDragEnd(event)}
                      >
                        <SortableContext
                          items={links.map((link) => link.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {links.map((link) => renderLinkCard(link, true))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {linksError ? (
                    <div className={styles.fieldError}>{linksError}</div>
                  ) : null}
                </section>
              </div>
            ) : null}

            {activeTab === "style" ? (
              <div className={styles.sectionStack}>
                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Presets</div>
                      <h2>Start from a style direction</h2>
                      <p>
                        Pick a base look, then fine-tune the details below without
                        losing the calm minimal feel.
                      </p>
                    </div>
                  </div>

                  <div className={styles.templateGrid}>
                    {STYLE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={`${styles.templateCard} ${
                          currentTemplateId === template.id
                            ? styles.templateCardActive
                            : ""
                        }`}
                        onClick={() => applyStyleTemplate(template)}
                      >
                        <div className={styles.templateTopRow}>
                          <span
                            className={styles.templateAccent}
                            style={{ background: template.accentColor }}
                          />
                          <span className={styles.templateName}>{template.label}</span>
                        </div>
                        <p className={styles.templateDescription}>
                          {template.description}
                        </p>
                        <div className={styles.inlineMetaChips}>
                          <span className={styles.metaChip}>
                            {formatStyleLabel(template.settings.buttonStyle)}
                          </span>
                          <span className={styles.metaChip}>
                            {template.settings.themePreset}
                          </span>
                          <span className={styles.metaChip}>
                            {template.settings.fontPreset}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Buttons</div>
                      <h2>Link style and spacing</h2>
                      <p>
                        Tune the shape, density, and label treatment of the main
                        call-to-action stack.
                      </p>
                    </div>
                  </div>

                  <div className={styles.styleGrid}>
                    {STYLE_OPTIONS.map((style) => (
                      <div
                        key={style}
                        role="button"
                        tabIndex={0}
                        className={`${styles.styleCard} ${
                          profile.buttonStyle === style ? styles.styleCardActive : ""
                        }`}
                        onClick={() => {
                          const nextProfile = {
                            ...profile,
                            buttonStyle: style,
                          };
                          setProfile(nextProfile);
                          queueStyleSave(buildStylePayload(nextProfile));
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }

                          event.preventDefault();
                          const nextProfile = {
                            ...profile,
                            buttonStyle: style,
                          };
                          setProfile(nextProfile);
                          queueStyleSave(buildStylePayload(nextProfile));
                        }}
                      >
                        <button
                          className={`btn-base btn-size-${profile.buttonSize} btn-${style} preview-btn`}
                          type="button"
                          tabIndex={-1}
                          style={stylePreviewVariables}
                        >
                          Sample Link
                        </button>
                        <div className={styles.styleCardName}>
                          {formatStyleLabel(style)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.settingsStack}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Button size</span>
                      <div className={styles.optionGrid}>
                        {BUTTON_SIZE_OPTIONS.map((buttonSize) => (
                          <button
                            key={buttonSize.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.buttonSize === buttonSize.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                buttonSize: buttonSize.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {buttonSize.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {buttonSize.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Button labels</span>
                      <div className={styles.optionGrid}>
                        {BUTTON_LABEL_STYLE_OPTIONS.map((labelStyle) => (
                          <button
                            key={labelStyle.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.buttonLabelStyle === labelStyle.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                buttonLabelStyle: labelStyle.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {labelStyle.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {labelStyle.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Glass blur</span>
                      <div className={styles.optionGrid}>
                        {BUTTON_BLUR_OPTIONS.map((buttonBlur) => (
                          <button
                            key={buttonBlur.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.buttonBlur === buttonBlur.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                buttonBlur: buttonBlur.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {buttonBlur.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {buttonBlur.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Canvas</div>
                      <h2>Page width, theme, and color</h2>
                      <p>
                        Control the page frame, choose a palette, and set the
                        accent that holds everything together.
                      </p>
                    </div>
                  </div>

                  <div className={styles.settingsStack}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Page width</span>
                      <div className={styles.optionGrid}>
                        {PAGE_WIDTH_OPTIONS.map((pageWidth) => (
                          <button
                            key={pageWidth.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.pageWidth === pageWidth.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                pageWidth: pageWidth.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {pageWidth.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {pageWidth.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Ready themes</span>
                      <div className={styles.optionGrid}>
                        {THEME_OPTIONS.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.themePreset === theme.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                themePreset: theme.id,
                                accentColor: theme.accentColor,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {theme.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {theme.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Background</span>
                      <div className={styles.optionGrid}>
                        {BACKGROUND_OPTIONS.map((background) => (
                          <button
                            key={background.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.backgroundStyle === background.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                backgroundStyle: background.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {background.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {background.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Accent color</span>
                      <div className={styles.colorPickerRow}>
                        <div className={styles.swatches}>
                          {COLOR_PRESETS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`${styles.swatch} ${
                                profile.accentColor === color
                                  ? styles.swatchActive
                                  : ""
                              }`}
                              style={{ background: color }}
                              onClick={() => {
                                const nextProfile = {
                                  ...profile,
                                  accentColor: color,
                                };
                                setProfile(nextProfile);
                                queueStyleSave(buildStylePayload(nextProfile));
                              }}
                            />
                          ))}
                        </div>
                        <input
                          type="color"
                          aria-label="Choose accent color"
                          className={styles.nativeColorInput}
                          value={getSafeHexColor(profile.accentColor, "#d97b4a")}
                          onChange={(event) => {
                            const nextProfile = {
                              ...profile,
                              accentColor: event.target.value.toLowerCase(),
                            };
                            setProfile(nextProfile);
                            queueStyleSave(buildStylePayload(nextProfile));
                          }}
                        />
                      </div>
                    </div>

                    <label className={styles.fieldGroup}>
                      <span className={styles.label}>Custom hex</span>
                      <input
                        className={styles.hexInput}
                        value={profile.accentColor}
                        onChange={(event) => {
                          const value = event.target.value;
                          setProfile((current) => ({
                            ...current,
                            accentColor: value,
                          }));
                        }}
                        onBlur={() => queueStyleSave(buildStylePayload(profile))}
                      />
                    </label>
                  </div>
                </section>

                <section className={styles.surfaceCard}>
                  <div className={styles.surfaceHeader}>
                    <div>
                      <div className={styles.surfaceEyebrow}>Finishing</div>
                      <h2>Type, motion, and polish</h2>
                      <p>
                        Set the font pair, animation tone, and a couple of final
                        public-page details.
                      </p>
                    </div>
                  </div>

                  <div className={styles.settingsStack}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Fonts</span>
                      <div className={styles.optionGrid}>
                        {FONT_OPTIONS.map((font) => (
                          <button
                            key={font.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.fontPreset === font.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                fontPreset: font.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {font.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {font.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.label}>Animations</span>
                      <div className={styles.optionGrid}>
                        {ANIMATION_OPTIONS.map((animation) => (
                          <button
                            key={animation.id}
                            type="button"
                            className={`${styles.optionCard} ${
                              profile.animationPreset === animation.id
                                ? styles.optionCardActive
                                : ""
                            }`}
                            onClick={() => {
                              const nextProfile = {
                                ...profile,
                                animationPreset: animation.id,
                              };
                              setProfile(nextProfile);
                              queueStyleSave(buildStylePayload(nextProfile));
                            }}
                          >
                            <div className={styles.optionCardTitle}>
                              {animation.label}
                            </div>
                            <div className={styles.optionCardText}>
                              {animation.preview}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.inlineSettings}>
                      <div className={styles.profileCard}>
                        <div className={styles.profileCardTitle}>Watermark</div>
                        <div className={styles.profileCardText}>
                          The “made with koki” watermark stays visible on every
                          public page.
                        </div>
                      </div>

                      <div className={styles.profileCard}>
                        <div className={styles.profileCardTitle}>
                          Public theme toggle
                        </div>
                        <div className={styles.profileCardText}>
                          Let visitors switch between light and dark modes on the
                          public page.
                        </div>
                        <button
                          type="button"
                          className={`${styles.secondaryButton} ${
                            profile.showThemeToggle
                              ? styles.toggleButtonActive
                              : ""
                          }`}
                          onClick={() => {
                            const nextProfile = {
                              ...profile,
                              showThemeToggle: !profile.showThemeToggle,
                            };
                            setProfile(nextProfile);
                            queueStyleSave(buildStylePayload(nextProfile));
                          }}
                        >
                          {profile.showThemeToggle
                            ? "Theme toggle visible"
                            : "Theme toggle hidden"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>

        <aside
          className={[
            styles.panel,
            styles.previewPanel,
            isCompactViewport && compactPreviewMode === "edit"
              ? styles.mobileHidden
              : "",
          ].join(" ")}
        >
          <div className={styles.previewShell}>
            <div className={styles.previewHeader}>
              <div className={styles.previewHeaderTop}>
                <div>
                  <h2>Live preview</h2>
                  <p>{siteOrigin ? `${siteOrigin}${publicPath}` : publicPath}</p>
                </div>
                <div
                  className={`${styles.statusPill} ${
                    saveStatusTone === "saving"
                      ? styles.statusPillSaving
                      : saveStatusTone === "saved"
                        ? styles.statusPillSaved
                        : saveStatusTone === "error"
                          ? styles.statusPillError
                          : ""
                  }`}
                >
                  {saveStatusTone === "error" ? "Check changes" : "Live"}
                </div>
              </div>

              <div className={styles.inlineMetaChips}>
                <span className={styles.metaChip}>{currentThemeLabel}</span>
                <span className={styles.metaChip}>
                  {formatStyleLabel(profile.buttonStyle)}
                </span>
                <span className={styles.metaChip}>
                  {profile.fontPreset}
                </span>
              </div>

              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleCopyPublicLink()}
                >
                  {copiedPublicLink ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    window.open(publicPath, "_blank", "noopener,noreferrer")
                  }
                >
                  Open page
                </button>
              </div>
            </div>
            <PublicBioPage page={previewPage} preview />
          </div>
        </aside>
      </div>

      <div className={styles.bottomTabs}>
        {(["profile", "links", "style"] as EditorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabButton} ${
              activeTab === tab ? styles.tabButtonActive : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          className={styles.tabButton}
          onClick={() =>
            setCompactPreviewMode((current) =>
              current === "edit" ? "preview" : "edit",
            )
          }
        >
          {compactPreviewLabel}
        </button>
      </div>

    </main>
  );
}
