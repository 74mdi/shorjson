import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomBar from "@/components/BottomBar";
import TopControls from "@/components/TopControls";

export const metadata: Metadata = {
  title: "Shor",
  description: "A minimal link shortener and notepad.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Shor" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Runs synchronously before first paint.
// Reads localStorage and OS preference, adds `dark` class to <html> if needed.
// Prevents flash of wrong theme (FOUC).
const darkModeScript = `
(function(){
  try{
    var m=localStorage.getItem('shor-mode');
    var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(m==='dark'||(m===null&&d)) document.documentElement.classList.add('dark');
  }catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the inline script modifies className before
    // React takes over, which would otherwise cause a hydration mismatch warning.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased min-h-screen">
        <TopControls />
        <BottomBar />
        {children}
      </body>
    </html>
  );
}
