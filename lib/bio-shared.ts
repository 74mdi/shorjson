export const BUTTON_STYLES = [
  "minimal",
  "outline",
  "outline-bold",
  "filled",
  "pill",
  "soft",
  "ghost",
  "card",
  "brutalist",
  "glass",
  "frame",
  "elevated",
  "underline",
  "split",
  "rail",
  "sticker",
  "blur",
  "shadow",
  "capsule",
  "tint",
  "grid",
  "cutout",
  "line",
  "panel",
  "slab",
  "tab",
  "notch",
  "frost",
  "mist",
  "veil",
  "aero",
  "halo",
  "glow",
  "neon",
  "quiet",
  "bold",
  "poster",
  "lifted",
  "inset",
  "etched",
  "mono",
  "pixel",
  "ribbon",
  "window",
  "tile",
  "soft-outline",
  "ring",
  "trace",
  "badge",
  "stack",
  "solid",
  "duo",
  "flare",
  "paperclip",
  "spring",
  "float",
  "wire",
  "prism",
  "orbit",
  "edge",
  "loom",
  "crest",
  "shell",
  "stamp",
  "banner",
  "cloud",
  "bevel",
  "spark",
  "crystal",
  "ticket",
  "sunken",
  "outline-pill",
  "shimmer",
] as const;

export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const THEME_PRESETS = [
  "mono",
  "paper",
  "midnight",
  "ocean",
  "sunset",
  "forest",
  "graphite",
  "rose",
  "citrus",
  "violet",
  "terminal",
  "porcelain",
  "ember",
  "mint",
  "berry",
  "sand",
  "lagoon",
  "aurora",
  "ink",
  "gold",
  "pearl",
  "spruce",
  "coral",
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];

const LEGACY_FONT_PRESETS = [
  "sans",
  "editorial",
  "grotesk",
  "mono",
  "sora",
  "fraunces",
  "outfit",
  "ibm",
  "newsreader",
  "syne",
] as const;

type LegacyFontPreset = (typeof LEGACY_FONT_PRESETS)[number];

export const FONT_BODY_PRESETS = [
  "manrope",
  "sora",
  "outfit",
  "ibm",
  "space",
  "system",
  "humanist",
  "rounded",
  "mono",
  "syne",
] as const;

export type FontBodyPreset = (typeof FONT_BODY_PRESETS)[number];

export const FONT_HEADING_PRESETS = [
  "manrope",
  "instrument",
  "fraunces",
  "newsreader",
  "syne",
] as const;

export type FontHeadingPreset = (typeof FONT_HEADING_PRESETS)[number];

export type FontPreset =
  | LegacyFontPreset
  | `${FontBodyPreset}-${FontHeadingPreset}`;

export const FONT_PRESETS: readonly FontPreset[] = [
  ...LEGACY_FONT_PRESETS,
  ...FONT_BODY_PRESETS.flatMap((body) =>
    FONT_HEADING_PRESETS.map((heading) => `${body}-${heading}` as FontPreset),
  ),
];

const LEGACY_ANIMATION_PRESETS = [
  "morph",
  "fade",
  "lift",
  "drift",
] as const;

type LegacyAnimationPreset = (typeof LEGACY_ANIMATION_PRESETS)[number];

export const ANIMATION_TONES = [
  "soft",
  "smooth",
  "crisp",
  "bold",
  "cinematic",
] as const;

export type AnimationTone = (typeof ANIMATION_TONES)[number];

export const ANIMATION_BASES = [
  "morph",
  "fade",
  "lift",
  "drift",
  "glide",
  "bloom",
  "pulse",
  "breeze",
  "zoom",
  "ripple",
] as const;

export type AnimationBase = (typeof ANIMATION_BASES)[number];

export type AnimationPreset =
  | LegacyAnimationPreset
  | `${AnimationTone}-${AnimationBase}`;

export const ANIMATION_PRESETS: readonly AnimationPreset[] = [
  ...LEGACY_ANIMATION_PRESETS,
  ...ANIMATION_TONES.flatMap((tone) =>
    ANIMATION_BASES.map((base) => `${tone}-${base}` as AnimationPreset),
  ),
];

export const BACKGROUND_STYLES = [
  "plain",
  "grid",
  "dots",
  "mesh",
  "grain",
  "stripes",
  "spotlight",
  "waves",
  "plaid",
  "halo",
  "constellation",
  "linen",
  "radial",
] as const;

export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

export const BUTTON_SIZES = [
  "compact",
  "balanced",
  "roomy",
] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

export const BUTTON_BLURS = [
  "none",
  "soft",
  "strong",
] as const;

export type ButtonBlur = (typeof BUTTON_BLURS)[number];

export const PAGE_WIDTHS = [
  "narrow",
  "standard",
  "wide",
] as const;

export type PageWidth = (typeof PAGE_WIDTHS)[number];

export const BUTTON_LABEL_STYLES = [
  "normal",
  "uppercase",
  "spaced",
] as const;

export type ButtonLabelStyle = (typeof BUTTON_LABEL_STYLES)[number];

const FONT_BODY_LABELS: Record<FontBodyPreset, string> = {
  manrope: "Manrope",
  sora: "Sora",
  outfit: "Outfit",
  ibm: "IBM Plex",
  space: "Space Grotesk",
  system: "System UI",
  humanist: "Humanist",
  rounded: "Rounded UI",
  mono: "Mono",
  syne: "Syne",
};

const FONT_HEADING_LABELS: Record<FontHeadingPreset, string> = {
  manrope: "Manrope",
  instrument: "Instrument Serif",
  fraunces: "Fraunces",
  newsreader: "Newsreader",
  syne: "Syne",
};

const LEGACY_FONT_LABELS: Record<
  LegacyFontPreset,
  { label: string; preview: string }
> = {
  sans: {
    label: "Sans",
    preview: "Quiet and neutral.",
  },
  editorial: {
    label: "Editorial",
    preview: "Serif-led and refined.",
  },
  grotesk: {
    label: "Grotesk",
    preview: "Modern and airy.",
  },
  mono: {
    label: "Mono",
    preview: "Code-like and crisp.",
  },
  sora: {
    label: "Sora",
    preview: "Futuristic and smooth.",
  },
  fraunces: {
    label: "Fraunces",
    preview: "Decorative serif contrast.",
  },
  outfit: {
    label: "Outfit",
    preview: "Rounded modern UI tone.",
  },
  ibm: {
    label: "IBM Plex",
    preview: "Utility-first and structured.",
  },
  newsreader: {
    label: "Newsreader",
    preview: "Soft editorial book tone.",
  },
  syne: {
    label: "Syne",
    preview: "Bold expressive headings.",
  },
};

const ANIMATION_BASE_LABELS: Record<
  AnimationBase,
  { label: string; preview: string }
> = {
  morph: {
    label: "Morph",
    preview: "Soft scale and fade.",
  },
  fade: {
    label: "Fade",
    preview: "Clean opacity-led entrance.",
  },
  lift: {
    label: "Lift",
    preview: "Small vertical reveal.",
  },
  drift: {
    label: "Drift",
    preview: "Slow floating movement.",
  },
  glide: {
    label: "Glide",
    preview: "Side-to-side motion with hover slide.",
  },
  bloom: {
    label: "Bloom",
    preview: "Soft expansion with a brighter hover.",
  },
  pulse: {
    label: "Pulse",
    preview: "Press-forward motion with spring.",
  },
  breeze: {
    label: "Breeze",
    preview: "Airy sway with gentle tilt.",
  },
  zoom: {
    label: "Zoom",
    preview: "Closer, bolder emphasis.",
  },
  ripple: {
    label: "Ripple",
    preview: "Light echo and ring glow.",
  },
};

const ANIMATION_TONE_LABELS: Record<
  AnimationTone,
  { label: string; preview: string }
> = {
  soft: {
    label: "Soft",
    preview: "Barely-there hover movement.",
  },
  smooth: {
    label: "Smooth",
    preview: "Balanced and easy.",
  },
  crisp: {
    label: "Crisp",
    preview: "Faster, tighter timing.",
  },
  bold: {
    label: "Bold",
    preview: "Stronger hover push.",
  },
  cinematic: {
    label: "Cinematic",
    preview: "Longer motion with more atmosphere.",
  },
};

function includesValue<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export function isButtonStyle(value: string): value is ButtonStyle {
  return includesValue(BUTTON_STYLES, value);
}

export function isThemePreset(value: string): value is ThemePreset {
  return includesValue(THEME_PRESETS, value);
}

export function isFontPreset(value: string): value is FontPreset {
  return (FONT_PRESETS as readonly string[]).includes(value);
}

export function isAnimationPreset(value: string): value is AnimationPreset {
  return (ANIMATION_PRESETS as readonly string[]).includes(value);
}

export function isBackgroundStyle(value: string): value is BackgroundStyle {
  return includesValue(BACKGROUND_STYLES, value);
}

export function isButtonSize(value: string): value is ButtonSize {
  return includesValue(BUTTON_SIZES, value);
}

export function isButtonBlur(value: string): value is ButtonBlur {
  return includesValue(BUTTON_BLURS, value);
}

export function isPageWidth(value: string): value is PageWidth {
  return includesValue(PAGE_WIDTHS, value);
}

export function isButtonLabelStyle(value: string): value is ButtonLabelStyle {
  return includesValue(BUTTON_LABEL_STYLES, value);
}

export function getAccessibleTextColorForBackground(value: string): string {
  const normalized = value.trim().toLowerCase();
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!match) return "#111111";

  const hex = match[1];
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const luminance = channels
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (total, channel, index) =>
        total + channel * [0.2126, 0.7152, 0.0722][index],
      0,
    );

  return luminance > 0.55 ? "#111111" : "#ffffff";
}

export function getButtonBlurValue(value: ButtonBlur): string {
  switch (value) {
    case "none":
      return "0px";
    case "strong":
      return "22px";
    default:
      return "14px";
  }
}

export function getPageWidthValue(value: PageWidth): string {
  switch (value) {
    case "narrow":
      return "360px";
    case "wide":
      return "520px";
    default:
      return "420px";
  }
}

export function getButtonLabelStyleTokens(
  value: ButtonLabelStyle,
): { letterSpacing: string; textTransform: "none" | "uppercase" } {
  switch (value) {
    case "uppercase":
      return {
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      };
    case "spaced":
      return {
        textTransform: "none",
        letterSpacing: "0.06em",
      };
    default:
      return {
        textTransform: "none",
        letterSpacing: "0",
      };
  }
}

export function getFontPresetLabel(value: FontPreset): string {
  if (includesValue(LEGACY_FONT_PRESETS, value)) {
    return LEGACY_FONT_LABELS[value].label;
  }

  const [body, heading] = value.split("-") as [FontBodyPreset, FontHeadingPreset];
  return `${FONT_BODY_LABELS[body]} + ${FONT_HEADING_LABELS[heading]}`;
}

export function getFontPresetPreview(value: FontPreset): string {
  if (includesValue(LEGACY_FONT_PRESETS, value)) {
    return LEGACY_FONT_LABELS[value].preview;
  }

  const [body, heading] = value.split("-") as [FontBodyPreset, FontHeadingPreset];
  return `Body in ${FONT_BODY_LABELS[body]}, headings in ${FONT_HEADING_LABELS[heading]}.`;
}

export function getAnimationPresetLabel(value: AnimationPreset): string {
  if (includesValue(LEGACY_ANIMATION_PRESETS, value)) {
    return ANIMATION_BASE_LABELS[value].label;
  }

  const [tone, base] = value.split("-") as [AnimationTone, AnimationBase];
  return `${ANIMATION_TONE_LABELS[tone].label} ${ANIMATION_BASE_LABELS[base].label}`;
}

export function getAnimationPresetPreview(value: AnimationPreset): string {
  if (includesValue(LEGACY_ANIMATION_PRESETS, value)) {
    return ANIMATION_BASE_LABELS[value].preview;
  }

  const [tone, base] = value.split("-") as [AnimationTone, AnimationBase];
  return `${ANIMATION_TONE_LABELS[tone].preview} ${ANIMATION_BASE_LABELS[base].preview}`;
}

export type BioPage = {
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  buttonStyle: ButtonStyle;
  accentColor: string;
  themePreset: ThemePreset;
  fontPreset: FontPreset;
  animationPreset: AnimationPreset;
  backgroundStyle: BackgroundStyle;
  buttonSize: ButtonSize;
  buttonBlur: ButtonBlur;
  pageWidth: PageWidth;
  buttonLabelStyle: ButtonLabelStyle;
  watermarkText: string;
  showThemeToggle: boolean;
  links: {
    id: string;
    title: string;
    url: string;
    icon: string;
    iconColor: string;
    section: string;
    visible: boolean;
    order: number;
  }[];
};

type BuildBioPageProfile = {
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  buttonStyle: ButtonStyle;
  accentColor: string;
  themePreset: ThemePreset;
  fontPreset: FontPreset;
  animationPreset: AnimationPreset;
  backgroundStyle: BackgroundStyle;
  buttonSize: ButtonSize;
  buttonBlur: ButtonBlur;
  pageWidth: PageWidth;
  buttonLabelStyle: ButtonLabelStyle;
  watermarkText: string;
  showThemeToggle: boolean;
};

type BuildBioPageLink = {
  id: string;
  title: string;
  url: string;
  icon: string;
  iconColor: string;
  section: string;
  visible: boolean;
  order: number;
};

export function getPublicBioPath(username: string): string {
  const normalized = username.trim().toLowerCase() || "username";
  return `/@${normalized}`;
}

export function buildBioPageData(
  profile: BuildBioPageProfile,
  links: BuildBioPageLink[],
): BioPage {
  return {
    username: profile.username,
    displayName: profile.displayName || profile.username,
    bio: profile.bio,
    avatar: profile.avatar,
    buttonStyle: profile.buttonStyle,
    accentColor: profile.accentColor,
    themePreset: profile.themePreset,
    fontPreset: profile.fontPreset,
    animationPreset: profile.animationPreset,
    backgroundStyle: profile.backgroundStyle,
    buttonSize: profile.buttonSize,
    buttonBlur: profile.buttonBlur,
    pageWidth: profile.pageWidth,
    buttonLabelStyle: profile.buttonLabelStyle,
    watermarkText: "made with koki",
    showThemeToggle: profile.showThemeToggle,
    links: links
      .filter((link) => link.visible)
      .sort((left, right) => left.order - right.order)
      .map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        icon: link.icon,
        iconColor: link.iconColor,
        section: link.section || "main",
        visible: link.visible,
        order: link.order,
      })),
  };
}
