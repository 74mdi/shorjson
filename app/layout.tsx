import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomBar from "@/components/BottomBar";
import TopControls from "@/components/TopControls";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import {
  geistMono,
  instrumentSerif,
  manrope,
  spaceGrotesk,
} from "@/lib/fonts";
import { getOptionalSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shor",
  description: "A minimal private links and notes workspace.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shor",
    startupImage: [],
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession();

  return (
    // suppressHydrationWarning: the inline script modifies className before
    // React takes over, which would otherwise cause a hydration mismatch warning.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={[
          "antialiased min-h-screen",
          instrumentSerif.variable,
          geistMono.variable,
          manrope.variable,
          spaceGrotesk.variable,
        ].join(" ")}
      >
        <ServiceWorkerRegister />
        <TopControls
          auth={
            session
              ? {
                  username: session.username,
                  csrfToken: session.csrfToken,
                }
              : null
          }
        />
        <BottomBar />
        {children}
      </body>
    </html>
  );
}
