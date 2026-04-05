import { Geist_Mono, Instrument_Serif } from "next/font/google";

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
