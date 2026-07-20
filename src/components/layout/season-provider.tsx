"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSeason, type Season } from "@/lib/season";

const SeasonContext = createContext<Season>("spring");

export function useSeason() {
  return useContext(SeasonContext);
}

// Components opt in to seasonal styling individually - either by reading
// useSeason() directly, or by relying on the CSS variables this provider
// sets on <html> (--season-radius, --season-accent, --season-divider),
// which a handful of components reference via arbitrary Tailwind values
// like rounded-[var(--season-radius)]. Nothing here overrides the core
// palette - this is a mood layer, not a reskin.
export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<Season>("spring");

  useEffect(() => {
    const current = getSeason();
    setSeason(current);
    document.documentElement.setAttribute("data-season", current);
  }, []);

  return <SeasonContext.Provider value={season}>{children}</SeasonContext.Provider>;
}
