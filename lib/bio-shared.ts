export type ButtonStyle =
  | "minimal"
  | "outline"
  | "filled"
  | "pill"
  | "soft"
  | "ghost"
  | "card"
  | "brutalist";

const BUTTON_STYLES: ButtonStyle[] = [
  "minimal",
  "outline",
  "filled",
  "pill",
  "soft",
  "ghost",
  "card",
  "brutalist",
];

export function isButtonStyle(value: string): value is ButtonStyle {
  return BUTTON_STYLES.includes(value as ButtonStyle);
}

export type BioPage = {
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  buttonStyle: ButtonStyle;
  accentColor: string;
  links: {
    id: string;
    title: string;
    url: string;
    icon: string;
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
};

type BuildBioPageLink = {
  id: string;
  title: string;
  url: string;
  icon: string;
  section: string;
  visible: boolean;
  order: number;
};

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
    links: links
      .filter((link) => link.visible)
      .sort((left, right) => left.order - right.order)
      .map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        icon: link.icon,
        section: link.section || "main",
        visible: link.visible,
        order: link.order,
      })),
  };
}
