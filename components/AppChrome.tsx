"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BottomBar from "./BottomBar";
import TopControls from "./TopControls";

type ShellAuth = {
  csrfToken: string;
  username: string;
} | null;

export default function AppChrome({
  initialAuth,
}: {
  initialAuth: ShellAuth;
}) {
  const pathname = usePathname();
  const [auth, setAuth] = useState<ShellAuth>(initialAuth);

  useEffect(() => {
    setAuth(initialAuth);
  }, [initialAuth]);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled && response.status === 401) {
            setAuth(null);
          }
          return;
        }

        const data = (await response.json().catch(() => null)) as
          | {
              csrfToken?: string;
              user?: { username?: string };
            }
          | null;

        if (!cancelled && data?.csrfToken && data.user?.username) {
          setAuth({
            csrfToken: data.csrfToken,
            username: data.user.username,
          });
        }
      } catch {
        // Keep the last known auth state if the sync check fails transiently.
      }
    }

    void syncAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <TopControls auth={auth} />
      <BottomBar authenticated={Boolean(auth)} />
    </>
  );
}
