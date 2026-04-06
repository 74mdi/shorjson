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
] as const;

export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

export const BUTTON_SIZES = [
  "compact",
  "balanced",
  "roomy",
] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

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
    watermarkText: "made with shor",
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
