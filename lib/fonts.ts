import {
  Fraunces,
  Geist_Mono,
  IBM_Plex_Sans,
  Instrument_Serif,
  Manrope,
  Newsreader,
  Outfit,
  Sora,
  Space_Grotesk,
  Syne,
} from "next/font/google";

export const instrumentSerif = Instrument_Serif({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

export const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const manrope = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const spaceGrotesk = Space_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const sora = Sora({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sora",
});

export const fraunces = Fraunces({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const outfit = Outfit({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const ibmPlexSans = IBM_Plex_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
});

export const newsreader = Newsreader({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-newsreader",
});

export const syne = Syne({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-syne",
});
