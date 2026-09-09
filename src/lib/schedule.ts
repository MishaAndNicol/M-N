// Timezone helpers for the "when are we watching?" scheduler in
// components/ui/watch-schedule.tsx.
//
// Core idea: a proposal is stored as a single absolute instant (UTC millis)
// plus who made it - never as "day index 2" or similar. Which visible day
// cell a proposal belongs to is worked out separately, per viewer, by
// converting that instant into the viewer's own timezone. That's what
// keeps two people in different timezones from ever fighting over what
// "day 2" means: there's no such thing as day 2, only real calendar days
// in each person's own zone, derived from the same shared instant.

// en-CA gives YYYY-MM-DD directly, which both sorts and compares correctly
// as a plain string - no date-fns-tz or similar dependency needed for
// something this narrow.
export function dateKeyInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Turns "this calendar day, this wall-clock time, in this timezone" into
// the UTC instant it actually refers to. Standard offset-probe approach:
// treat the wall time as if it were UTC, see what that instant reads as
// in the target zone, then correct by the difference. Good to the minute
// for every real-world case except a request landing inside the one-hour
// gap skipped by a DST spring-forward transition, which we don't try to
// special-case here.
export function zonedTimeToUtcMillis(dateKey: string, time: string, timeZone: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(guessUtc));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const zonedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  const offset = zonedAsUtc - guessUtc;
  return guessUtc - offset;
}
