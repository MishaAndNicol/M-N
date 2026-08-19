// Helpers for the "when are we watching?" scheduler on the watch room.
//
// Core idea: a proposal is stored as a single absolute instant (UTC millis)
// plus who made it - never as "day index 2" or similar. Which visible day
// cell a proposal belongs to is worked out separately, per viewer, by
// converting that instant into the viewer's own timezone. That's what
// keeps two people in different timezones from ever fighting over what
// "day 2" means: there's no such thing as day 2, only real calendar days
// in each person's own zone, derived from the same shared instant.

export type Proposal = {
  by: "a" | "b";
  utcMillis: number;
  // The YYYY-MM-DD the proposer clicked, in their own timezone, at the
  // moment they proposed. Never used to decide bucketing - display only,
  // so a panel can say "you proposed for your Friday" even if that later
  // reads as Saturday for the other person.
  proposedLocalDate: string;
  createdAtMillis: number;
};

export type ScheduleState = {
  proposals: Record<string, Proposal>;
  agreedProposalId: string | null;
};

export const EMPTY_SCHEDULE: ScheduleState = {
  proposals: {},
  agreedProposalId: null,
};

export function createProposalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

export function formatTimeInZone(utcMillis: number, timeZone: string): string {
  return new Date(utcMillis).toLocaleTimeString([], { timeZone, hour: "2-digit", minute: "2-digit" });
}

export function formatDayLabelInZone(utcMillis: number, timeZone: string): string {
  return new Date(utcMillis).toLocaleDateString("en-US", { timeZone, weekday: "short", day: "numeric" });
}

export type WeekCell = { dateKey: string; label: string; num: number };

// "Today + next 6 days", recomputed from scratch on every call - always in
// the given viewer's own timezone, so two viewers in different zones can
// legitimately see slightly different 7-day windows near midnight without
// anything breaking (see bucketProposals below for why that's fine).
export function buildWeek(timeZone: string, days = 7): WeekCell[] {
  const now = new Date();
  const cells: WeekCell[] = [];
  for (let i = 0; i < days; i++) {
    const probe = new Date(now.getTime() + i * 86_400_000);
    const dateKey = dateKeyInZone(probe, timeZone);
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", day: "numeric" }).formatToParts(
      probe
    );
    cells.push({
      dateKey,
      label: parts.find((p) => p.type === "weekday")?.value ?? "",
      num: Number(parts.find((p) => p.type === "day")?.value ?? 0),
    });
  }
  return cells;
}

export type DayStatus = "none" | "pending_me" | "pending_them" | "conflict" | "agreed";

export type DaySlot = WeekCell & {
  status: DayStatus;
  mine: { id: string; proposal: Proposal } | null;
  theirs: { id: string; proposal: Proposal } | null;
  agreed: { id: string; proposal: Proposal } | null;
};

// Buckets every stored proposal into the visible week purely by where its
// UTC instant lands in the *viewer's* timezone - never by any stored day
// index. A proposal that crosses midnight for one side simply shows up in
// a different cell for each person; there's nothing to keep in sync
// because there was never a shared notion of "cell 2" to begin with.
export function bucketProposals(
  schedule: ScheduleState,
  timeZone: string,
  whoAmI: "a" | "b",
  week: WeekCell[]
): DaySlot[] {
  const entries = Object.entries(schedule.proposals);

  return week.map((cell) => {
    let mine: DaySlot["mine"] = null;
    let theirs: DaySlot["theirs"] = null;
    let agreed: DaySlot["agreed"] = null;

    for (const [id, proposal] of entries) {
      if (dateKeyInZone(new Date(proposal.utcMillis), timeZone) !== cell.dateKey) continue;
      if (id === schedule.agreedProposalId) {
        agreed = { id, proposal };
      } else if (proposal.by === whoAmI) {
        mine = { id, proposal };
      } else {
        theirs = { id, proposal };
      }
    }

    let status: DayStatus = "none";
    if (agreed) status = "agreed";
    else if (mine && theirs) status = "conflict";
    else if (theirs) status = "pending_them";
    else if (mine) status = "pending_me";

    return { ...cell, status, mine, theirs, agreed };
  });
}
