export type Season = "spring" | "summer" | "autumn" | "winter";

// Northern-hemisphere meteorological seasons, based on the visitor's local
// date. Good enough for an ambient mood layer - this isn't trying to be
// astronomically precise, and either person's real location is northern
// hemisphere anyway.
export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}
