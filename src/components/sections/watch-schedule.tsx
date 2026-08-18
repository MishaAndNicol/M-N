"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarHeart, ChevronDown, ChevronUp } from "lucide-react";
import { doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  EMPTY_SCHEDULE,
  buildWeek,
  bucketProposals,
  createProposalId,
  formatDayLabelInZone,
  formatTimeInZone,
  zonedTimeToUtcMillis,
  type DaySlot,
  type ScheduleState,
} from "@/lib/schedule";

const SCHEDULE_PATH = ["watchSchedule", "schedule"] as const;

type Props = {
  whoAmI: "a" | "b";
  myName: string;
  otherName: string;
  myTimezone?: string;
  otherTimezone?: string;
};

// Small line-drawn icons in the same single-colour, currentColor style as
// Snowy's paw print elsewhere on the stage (see snowy-easter-egg.tsx) -
// deliberately not the multi-colour peach/orange sketch from the design
// preview, since that palette doesn't belong to this site's actual
// scarlet/violet accent system and wouldn't re-colour correctly between
// light and dark mode.
function YarnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M5 10 Q12 14 19 10" strokeLinecap="round" />
      <path d="M5 14.5 Q12 10.5 19 14.5" strokeLinecap="round" />
      <path d="M8 5.5 Q13 12 8 18.5" strokeLinecap="round" />
    </svg>
  );
}

function CatIcon({ className, small }: { className?: string; small?: boolean }) {
  // `small` gives the settled/agreed look (ears only, quieter), the full
  // version is used for anything still active (pending or conflicting).
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5,9 L8,2 L11,8 Z" />
      <path d="M19,9 L16,2 L13,8 Z" />
      <circle cx="12" cy={small ? "13.5" : "14"} r={small ? "6.5" : "7.5"} />
    </svg>
  );
}

export function WatchSchedule({ whoAmI, myName, otherName, myTimezone, otherTimezone }: Props) {
  const [connected] = useState(isFirebaseConfigured);
  const [schedule, setSchedule] = useState<ScheduleState>(EMPTY_SCHEDULE);
  const [expanded, setExpanded] = useState(false);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const [timeInput, setTimeInput] = useState("19:00");
  const [countering, setCountering] = useState(false);

  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    const ref = doc(db, ...SCHEDULE_PATH);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSchedule({ ...EMPTY_SCHEDULE, ...(snap.data() as Partial<ScheduleState>) });
      }
    });
    return () => unsub();
  }, [connected]);

  async function writeSchedule(patch: Record<string, unknown>) {
    if (!connected) return; // local-only preview: nothing to sync to
    const db = getDb();
    if (!db) return;
    await setDoc(doc(db, ...SCHEDULE_PATH), patch, { merge: true });
  }

  const week = useMemo(() => (myTimezone ? buildWeek(myTimezone) : []), [myTimezone]);
  const days = useMemo(
    () => (myTimezone ? bucketProposals(schedule, myTimezone, whoAmI, week) : []),
    [schedule, myTimezone, whoAmI, week]
  );
  const openDay = days.find((d) => d.dateKey === openDateKey) ?? null;

  // Nothing sensible to schedule without both timezones configured -
  // the site-wide partner-time widget has the same requirement.
  if (!myTimezone || !otherTimezone) return null;

  function propose(dateKey: string) {
    const utcMillis = zonedTimeToUtcMillis(dateKey, timeInput, myTimezone!);
    const id = createProposalId();
    void writeSchedule({
      proposals: {
        [id]: {
          by: whoAmI,
          utcMillis,
          proposedLocalDate: dateKey,
          createdAtMillis: Date.now(),
        },
      },
    });
    setCountering(false);
  }

  function cancelMine(id: string) {
    void writeSchedule({ proposals: { [id]: deleteField() } });
  }

  function agree(id: string) {
    void writeSchedule({ agreedProposalId: id });
  }

  function unagree() {
    void writeSchedule({ agreedProposalId: null });
  }

  const summary = summarizeReadable(days, otherName, myTimezone);
  const needsAttention = days.some((d) => d.status === "pending_them" || d.status === "conflict");

  return (
    <div className="card-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm">
          <CalendarHeart className="h-4 w-4 shrink-0 text-thread" />
          <span className="font-medium">When are we watching?</span>
          <span className={cn("text-mist", needsAttention && "text-thread")}>{summary}</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-mist" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-mist" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-6 pb-6 pt-4 dark:border-line-dark">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {days.map((d) => (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => {
                      setOpenDateKey(d.dateKey === openDateKey ? null : d.dateKey);
                      setCountering(false);
                      setTimeInput("19:00");
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-full border transition-colors",
                        d.status === "none" && "border-line bg-white/40 text-mist dark:border-line-dark dark:bg-white/[0.04]",
                        (d.status === "pending_me" || d.status === "pending_them" || d.status === "conflict") &&
                          "border-thread/40 bg-thread/10 text-thread",
                        d.status === "agreed" && "border-thread/25 bg-thread/[0.06] text-thread"
                      )}
                    >
                      {d.status === "none" && <YarnIcon className="h-5 w-5" />}
                      {(d.status === "pending_me" || d.status === "pending_them" || d.status === "conflict") && (
                        <CatIcon className="h-6 w-6" />
                      )}
                      {d.status === "agreed" && <CatIcon className="h-[18px] w-[18px]" small />}
                    </span>
                    <span className="text-[11px] text-mist">
                      {d.label} {d.num}
                    </span>
                  </button>
                ))}
              </div>

              {openDay && (
                <div className="mt-4 rounded-[var(--season-radius-sm)] border border-line bg-white/40 p-4 dark:border-line-dark dark:bg-white/[0.04]">
                  <p className="mb-3 text-sm font-medium">
                    {openDay.label} {openDay.num}
                  </p>

                  {openDay.status === "none" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                        className="rounded-full border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-thread dark:border-line-dark"
                      />
                      <button
                        type="button"
                        onClick={() => propose(openDay.dateKey)}
                        className="rounded-full bg-thread px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
                      >
                        Propose
                      </button>
                    </div>
                  )}

                  {openDay.status === "pending_them" && openDay.theirs && (
                    <PendingThem
                      slot={openDay}
                      otherName={otherName}
                      myTimezone={myTimezone}
                      otherTimezone={otherTimezone}
                      countering={countering}
                      timeInput={timeInput}
                      setTimeInput={setTimeInput}
                      onAgree={() => agree(openDay.theirs!.id)}
                      onStartCounter={() => setCountering(true)}
                      onCounter={() => propose(openDay.dateKey)}
                    />
                  )}

                  {openDay.status === "pending_me" && openDay.mine && (
                    <div>
                      <p className="mb-3 text-sm text-mist">
                        You proposed{" "}
                        <span className="text-ink dark:text-white/90">
                          {formatTimeInZone(openDay.mine.proposal.utcMillis, myTimezone)}
                        </span>{" "}
                        - waiting for {otherName} to reply.
                      </p>
                      <button
                        type="button"
                        onClick={() => cancelMine(openDay.mine!.id)}
                        className="rounded-full border border-line px-4 py-1.5 text-sm text-mist transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {openDay.status === "conflict" && openDay.mine && openDay.theirs && (
                    <div className="space-y-3">
                      <p className="text-sm text-mist">You proposed different times for this day.</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-full border border-line px-4 py-2 dark:border-line-dark">
                          <span>
                            You: {formatTimeInZone(openDay.mine.proposal.utcMillis, myTimezone)}
                            <span className="text-mist">
                              {" "}
                              ({otherName}&apos;s time: {formatTimeInZone(openDay.mine.proposal.utcMillis, otherTimezone)},{" "}
                              {formatDayLabelInZone(openDay.mine.proposal.utcMillis, otherTimezone)})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => agree(openDay.mine!.id)}
                            className="shrink-0 text-thread hover:underline"
                          >
                            Keep mine
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-full border border-line px-4 py-2 dark:border-line-dark">
                          <span>
                            {otherName}: {formatTimeInZone(openDay.theirs.proposal.utcMillis, otherTimezone)}
                            <span className="text-mist">
                              {" "}
                              (your time: {formatTimeInZone(openDay.theirs.proposal.utcMillis, myTimezone)},{" "}
                              {formatDayLabelInZone(openDay.theirs.proposal.utcMillis, myTimezone)})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => agree(openDay.theirs!.id)}
                            className="shrink-0 text-thread hover:underline"
                          >
                            Accept theirs
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {openDay.status === "agreed" && openDay.agreed && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm">
                        Agreed for{" "}
                        <span className="font-medium text-thread">
                          {formatTimeInZone(openDay.agreed.proposal.utcMillis, myTimezone)}
                        </span>{" "}
                        <span className="text-mist">
                          ({otherName}&apos;s time: {formatTimeInZone(openDay.agreed.proposal.utcMillis, otherTimezone)})
                        </span>
                      </p>
                      <button type="button" onClick={unagree} className="shrink-0 text-xs text-mist hover:text-thread">
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Split out just to keep the "pending on them" branch (which has its own
// small counter-offer sub-state) from ballooning the parent switch.
function PendingThem({
  slot,
  otherName,
  myTimezone,
  otherTimezone,
  countering,
  timeInput,
  setTimeInput,
  onAgree,
  onStartCounter,
  onCounter,
}: {
  slot: DaySlot;
  otherName: string;
  myTimezone: string;
  otherTimezone: string;
  countering: boolean;
  timeInput: string;
  setTimeInput: (v: string) => void;
  onAgree: () => void;
  onStartCounter: () => void;
  onCounter: () => void;
}) {
  const theirs = slot.theirs!;
  return (
    <div>
      <p className="mb-3 text-sm text-mist">
        {otherName} proposed{" "}
        <span className="text-ink dark:text-white/90">
          {formatTimeInZone(theirs.proposal.utcMillis, otherTimezone)}
        </span>{" "}
        ({otherName}&apos;s time) - your time:{" "}
        <span className="text-ink dark:text-white/90">{formatTimeInZone(theirs.proposal.utcMillis, myTimezone)}</span>
      </p>
      {!countering ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAgree}
            className="rounded-full bg-thread px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Agree
          </button>
          <button
            type="button"
            onClick={onStartCounter}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-mist transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
          >
            Propose a different time
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="rounded-full border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-thread dark:border-line-dark"
          />
          <button
            type="button"
            onClick={onCounter}
            className="rounded-full bg-thread px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

function summarizeReadable(days: DaySlot[], otherName: string, myTimezone: string): string {
  if (days.some((d) => d.status === "conflict")) return "you two proposed different times";
  const pendingThem = days.find((d) => d.status === "pending_them");
  if (pendingThem) return `${otherName} proposed a time - take a look`;
  const agreed = days.find((d) => d.status === "agreed");
  if (agreed) return `agreed: ${agreed.label} ${agreed.num}, ${formatTimeInZone(agreed.agreed!.proposal.utcMillis, myTimezone)}`;
  if (days.some((d) => d.status === "pending_me")) return `waiting on ${otherName}`;
  return "nothing planned yet";
}
