export type ButtonStyle =
  | "minimal"
  | "outline"
  | "outline-bold"
  | "filled"
  | "pill"
  | "soft"
  | "ghost"
  | "card"
  | "brutalist"
  | "glass"
  | "frame"
  | "elevated"
  | "underline"
  | "split"
  | "rail"
  | "sticker"
  | "blur"
  | "shadow"
  | "capsule"
  | "tint"
  | "grid"
  | "cutout"
  | "line"
  | "panel"
  | "slab"
  | "tab"
  | "notch"
  | "frost"
  | "mist"
  | "veil"
  | "aero"
  | "halo"
  | "glow"
  | "neon"
  | "quiet"
  | "bold"
  | "poster"
  | "lifted"
  | "inset"
  | "etched"
  | "mono"
  | "pixel"
  | "ribbon"
  | "window"
  | "tile"
  | "soft-outline"
  | "ring"
  | "trace"
  | "badge"
  | "stack"
  | "solid"
  | "duo"
  | "flare"
  | "paperclip"
  | "spring"
  | "float";

export type ThemePreset =
  | "mono"
  | "paper"
  | "midnight"
  | "ocean"
  | "sunset"
  | "forest"
  | "graphite"
  | "rose"
  | "citrus"
  | "violet"
  | "terminal"
  | "porcelain";

export type FontPreset =
  | "sans"
  | "editorial"
  | "grotesk"
  | "mono"
  | "sora"
  | "fraunces"
  | "outfit"
  | "ibm"
  | "newsreader"
  | "syne";

export type AnimationPreset =
  | "morph"
  | "fade"
  | "lift"
  | "drift";

export type BackgroundStyle =
  | "plain"
  | "grid"
  | "dots"
  | "mesh"
  | "grain"
  | "stripes";

export type ButtonSize =
  | "compact"
  | "balanced"
  | "roomy";

const BUTTON_STYLES: ButtonStyle[] = [
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
];

const THEME_PRESETS: ThemePreset[] = [
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
];

const FONT_PRESETS: FontPreset[] = [
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
];

const ANIMATION_PRESETS: AnimationPreset[] = [
  "morph",
  "fade",
  "lift",
  "drift",
];

const BACKGROUND_STYLES: BackgroundStyle[] = [
  "plain",
  "grid",
  "dots",
  "mesh",
  "grain",
  "stripes",
];

const BUTTON_SIZES: ButtonSize[] = [
  "compact",
  "balanced",
  "roomy",
];

export function isButtonStyle(value: string): value is ButtonStyle {
  return BUTTON_STYLES.includes(value as ButtonStyle);
}

export function isThemePreset(value: string): value is ThemePreset {
  return THEME_PRESETS.includes(value as ThemePreset);
}

export function isFontPreset(value: string): value is FontPreset {
  return FONT_PRESETS.includes(value as FontPreset);
}

export function isAnimationPreset(value: string): value is AnimationPreset {
  return ANIMATION_PRESETS.includes(value as AnimationPreset);
}

export function isBackgroundStyle(value: string): value is BackgroundStyle {
  return BACKGROUND_STYLES.includes(value as BackgroundStyle);
}

export function isButtonSize(value: string): value is ButtonSize {
  return BUTTON_SIZES.includes(value as ButtonSize);
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
