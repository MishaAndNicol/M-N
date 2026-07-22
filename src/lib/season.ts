// Seasonal design variations (spring/summer/autumn/winter) have been
// removed - the summer look is now the site's permanent, only design.
// This type/constant is kept so any remaining call sites still type-check
// without needing to be rewritten.
export type Season = "summer";

export function getSeason(): Season {
  return "summer";
}
