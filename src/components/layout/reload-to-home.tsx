"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// The greeting scene (the homepage hero) is meant to be the thing you land
// on again every time you *reload* the site, no matter which page you were
// last on - but ordinary in-app navigation (clicking Watch, Music, etc.)
// should still take you to that page normally and stay there.
//
// The distinction that makes this possible: a hard reload (F5, pull-to-
// refresh, re-typing the URL) creates a fresh Navigation Timing entry of
// type "reload"; a Next.js <Link> click never does, since it's handled by
// client-side routing and doesn't reload the document at all. So this only
// ever fires on genuine reloads, never on normal clicking-around.
export function ReloadToHome() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/") return;
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entry?.type === "reload") {
      router.replace("/");
    }
    // Intentionally only runs once per mount (i.e. once per real
    // navigation/reload) - not on every pathname change, since a client-side
    // route change on an already-reloaded page shouldn't get redirected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
