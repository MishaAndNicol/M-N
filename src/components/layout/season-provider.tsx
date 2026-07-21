"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSeason, type Season } from "@/lib/season";

const STORAGE_KEY = "season-override";

type SeasonContextValue = {
  /** The currently active season, whichever way it was chosen. */
  season: Season;
  /** true if nothing has been picked by hand - the calendar decides. */
  isAuto: boolean;
  /** Pick a season by hand, or pass "auto" to go back to the calendar. */
  setSeason: (next: Season | "auto") => void;
};

const SeasonContext = createContext<SeasonContextValue>({
  season: "spring",
  isAuto: true,
  setSeason: () => {},
});

// Components opt in to seasonal styling individually - either by reading
// useSeason() directly, or by relying on the CSS variables this provider
// sets on <html> (--season-radius, --season-accent, --season-divider),
// which a handful of components reference via arbitrary Tailwind values
// like rounded-[var(--season-radius)]. Nothing here overrides the core
// palette - this is a mood layer, not a reskin.
export function useSeason() {
  return useContext(SeasonContext).season;
}

// For the navbar's season switcher - exposes the setter and whether the
// visitor has overridden the calendar's pick.
export function useSeasonControls() {
  return useContext(SeasonContext);
}

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<Season>("spring");
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const isValid = stored === "spring" || stored === "summer" || stored === "autumn" || stored === "winter";
    const next = isValid ? (stored as Season) : getSeason();
    setSeasonState(next);
    setIsAuto(!isValid);
    document.documentElement.setAttribute("data-season", next);
  }, []);

  const setSeason = (next: Season | "auto") => {
    if (next === "auto") {
      window.localStorage.removeItem(STORAGE_KEY);
      const current = getSeason();
      setSeasonState(current);
      setIsAuto(true);
      document.documentElement.setAttribute("data-season", current);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, next);
    setSeasonState(next);
    setIsAuto(false);
    document.documentElement.setAttribute("data-season", next);
  };

  return (
    <SeasonContext.Provider value={{ season, isAuto, setSeason }}>{children}</SeasonContext.Provider>
  );
}
