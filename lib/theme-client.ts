"use client";

export const THEME_STORAGE_KEY = "shor-mode";
export const THEME_CHANGE_EVENT = "shor-theme-change";

export function getCurrentThemeIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { isDark },
    }),
  );
}

export function subscribeToTheme(
  listener: (isDark: boolean) => void,
): () => void {
  const handleThemeChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ isDark?: boolean }>;
    if (typeof customEvent.detail?.isDark === "boolean") {
      listener(customEvent.detail.isDark);
      return;
    }

    listener(getCurrentThemeIsDark());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      listener(getCurrentThemeIsDark());
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      THEME_CHANGE_EVENT,
      handleThemeChange as EventListener,
    );
    window.removeEventListener("storage", handleStorage);
  };
}
