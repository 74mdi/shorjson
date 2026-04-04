"use client";

// components/ThemeToggle.tsx
// Fixed top-right button that toggles between light and dark mode.
// Reads the initial state from the <html> class (set by the inline script in layout.tsx)
// and persists the user's choice to localStorage.

import { useEffect, useState } from "react";

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ThemeToggle() {
  // Start as undefined so we don't render until we know the real theme.
  // This avoids a hydration mismatch between server and client.
  const [isDark, setIsDark] = useState<boolean | undefined>(undefined);

  // On mount, read the current theme from the <html> element.
  // The inline script in layout.tsx will have already set the correct class.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);

    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  // Don't render anything until we know the theme — prevents icon flash
  if (isDark === undefined) return null;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        // Position
        "fixed top-5 right-5 z-50",
        // Shape & size
        "flex items-center justify-center rounded-full p-2.5",
        // Colors — light
        "bg-white text-[#555]",
        "border border-[#e8e8e3]",
        // Colors — dark
        "dark:bg-[#1c1c1a] dark:text-[#888] dark:border-[#2e2e2b]",
        // Interaction
        "shadow-sm hover:shadow-md",
        "transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "hover:text-[#1a1a1a] dark:hover:text-[#e2e2dc]",
      ].join(" ")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
