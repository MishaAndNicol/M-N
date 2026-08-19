"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Bell, BellOff, BellRing } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { dateKeyInZone, zonedTimeToUtcMillis } from "@/lib/schedule";

const SCHEDULE_COLLECTION = "watchSchedule";
const DAYS_AHEAD = 7;

type Proposal = {
  id: string;
  at: Timestamp;
  proposedBy: "a" | "b";
  status: "pending" | "agreed";
};

// --- icons -------------------------------------------------------------
// Hand-drawn rather than a library icon set, on purpose - Snowy is a
// running joke specific to this site, not a generic glyph.

function SmallPaw({ angle }: { angle: number }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#F0997B" style={{ transform: `rotate(${angle}deg)` }}>
      <circle cx="7" cy="8" r="2.3" />
      <circle cx="12" cy="6" r="2.3" />
      <circle cx="17" cy="8" r="2.3" />
      <path d="M12 12.2c-3.4 0-6.2 2.3-6.2 5.1 0 1.6 1.4 2.6 3 2.1 1-.3 2-.9 3.2-.9s2.2.6 3.2.9c1.6.5 3-.5 3-2.1 0-2.8-2.8-5.1-6.2-5.1Z" />
    </svg>
  );
}

// Empty day, nothing proposed yet - a little ball of yarn instead of
// leaving the badge blank or reusing the paw (paws are for the trail).
function YarnBall() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="#F5C4B3" stroke="#F0997B" strokeWidth="1.2" />
      <path d="M4.5,10 Q12,15 19.5,10" fill="none" stroke="#F0997B" strokeWidth="1" strokeLinecap="round" />
      <path d="M4.5,14 Q12,9 19.5,14" fill="none" stroke="#F0997B" strokeWidth="1" strokeLinecap="round" />
      <path d="M7,5 Q13,12 8,19.5" fill="none" stroke="#F0997B" strokeWidth="1" strokeLinecap="round" />
      <path d="M17,5.5 Q11,12 16,19" fill="none" stroke="#F0997B" strokeWidth="1" strokeLinecap="round" />
      <path d="M18,17 Q22,19 21,23" fill="none" stroke="#F0997B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// A proposal is out and waiting on someone - full-body Snowy, filled in.
function CatFull() {
  const c = "#D85A30";
  const inner = "#F5C4B3";
  const feature = "#FAECE7";
  return (
    <svg width="26" height="30" viewBox="0 0 30 34">
      <path d="M15,15 Q26,15 25,26 Q24,32 15,32 Q6,32 5,26 Q4,15 15,15 Z" fill={c} stroke={c} strokeWidth="1.3" />
      <path d="M23,24 Q29,22 27,14 Q26,10 23,12" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="10.5" cy="30.5" rx="2.6" ry="2.1" fill={c} />
      <ellipse cx="19.5" cy="30.5" rx="2.6" ry="2.1" fill={c} />
      <path d="M6,10 L9,3 L12,9 Z" fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M24,10 L21,3 L18,9 Z" fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.6,8.7 L9.3,5.2 L10.7,8.2 Z" fill={inner} />
      <path d="M22.4,8.7 L20.7,5.2 L19.3,8.2 Z" fill={inner} />
      <circle cx="15" cy="14.5" r="8" fill={c} stroke={c} strokeWidth="1.3" />
      <circle cx="11.8" cy="13.8" r="1.5" fill={feature} />
      <circle cx="18.2" cy="13.8" r="1.5" fill={feature} />
      <circle cx="12.2" cy="13.3" r="0.4" fill="white" />
      <circle cx="18.6" cy="13.3" r="0.4" fill="white" />
      <path d="M14,16.2 Q15,17.1 16,16.2" fill="none" stroke={feature} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// Both agreed - just the face, with a small, deliberately understated
// smile (an earlier, wider grin read as unsettling rather than happy).
function CatFace() {
  const c = "#D85A30";
  const inner = "#F5C4B3";
  const feature = "#FAECE7";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path d="M5,9 L8,2 L11,8 Z" fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M19,9 L16,2 L13,8 Z" fill={c} stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.7,7.7 L8.3,4.3 L9.8,7.2 Z" fill={inner} />
      <path d="M17.3,7.7 L15.7,4.3 L14.2,7.2 Z" fill={inner} />
      <circle cx="12" cy="14" r="7.5" fill={c} stroke={c} strokeWidth="1.3" />
      <circle cx="9.2" cy="13.2" r="1.5" fill={feature} />
      <circle cx="14.8" cy="13.2" r="1.5" fill={feature} />
      <circle cx="9.6" cy="12.7" r="0.4" fill="white" />
      <circle cx="15.2" cy="12.7" r="0.4" fill="white" />
      <path d="M10.8,15.8 Q12,16.5 13.2,15.8" fill="none" stroke={feature} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// --- helpers -------------------------------------------------------------

// Every hour, and every 5 minutes within it - a plain grid of tappable
// pills scrolls and taps far more reliably (especially on mobile) than
// the native <input type="time"> control, while still landing on the
// exact minute.
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDayFromKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

function fmtTime(d: Date, timezone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(d);
}

function fmtDay(d: Date, timezone?: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: timezone }).format(d);
}

// A small pill-based time picker: one scrollable row of hours, one
// scrollable row of 5-minute steps. Keeps the same rounded/thread visual
// language as the rest of the card instead of a bare native time input.
function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h, minute)}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs transition-colors",
              h === hour
                ? "border-thread bg-thread text-white dark:text-black"
                : "border-line text-mist hover:border-thread hover:text-thread dark:border-line-dark"
            )}
          >
            {pad(h)}
          </button>
        ))}
      </div>
      <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(hour, m)}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs transition-colors",
              m === minute
                ? "border-thread bg-thread text-white dark:text-black"
                : "border-line text-mist hover:border-thread hover:text-thread dark:border-line-dark"
            )}
          >
            {pad(m)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WatchSchedule({
  whoAmI,
  nameA,
  nameB,
  timezoneA,
  timezoneB,
}: {
  whoAmI: "a" | "b";
  nameA: string;
  nameB: string;
  timezoneA?: string;
  timezoneB?: string;
}) {
  const connected = isFirebaseConfigured;
  const otherName = whoAmI === "a" ? nameB : nameA;
  // Each person's proposal is always converted using *their own* fixed
  // timezone (Misha -> Asia/Seoul, Nicol -> Europe/Prague, as configured
  // in site-config.ts) - never the browser/device's local timezone. That
  // is what makes "I proposed 19:00" mean 19:00 in my own timezone no
  // matter what timezone the device under the browser happens to be set
  // to. `theirTimezone` is the fixed zone of whoever I'm not.
  const myTimezone = (whoAmI === "a" ? timezoneA : timezoneB) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const theirTimezone = whoAmI === "a" ? timezoneB : timezoneA;

  const [expanded, setExpanded] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [draftHour, setDraftHour] = useState(19);
  const [draftMinute, setDraftMinute] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const seenPendingIds = useRef<Set<string>>(new Set());
  const askedPermissionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  // Rolling window: "today + next 6 days" in *my own* timezone, read
  // fresh on every mount - so each side always sees calendar days as
  // they land locally for them, even right around midnight.
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const probe = new Date(now.getTime() + i * 86_400_000);
      return dateKeyInZone(probe, myTimezone);
    });
  }, [myTimezone]);

  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    const q = query(
      collection(db, SCHEDULE_COLLECTION),
      where("at", ">=", Timestamp.fromDate(new Date(Date.now() - 86_400_000))),
      orderBy("at", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setProposals(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            at: data.at as Timestamp,
            proposedBy: data.proposedBy === "b" ? "b" : "a",
            status: data.status === "agreed" ? "agreed" : "pending",
          } satisfies Proposal;
        })
      );
    });
    return () => unsub();
  }, [connected]);

  // Ask for browser-notification permission - either opportunistically the
  // first time someone proposes a time, or explicitly via the bell button
  // in the header. A real click/tap is required for the browser to allow
  // the prompt at all, so both paths only ever fire from a user gesture.
  function ensureNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default" && !askedPermissionRef.current) {
      askedPermissionRef.current = true;
      Notification.requestPermission().then(setNotifPermission);
    }
  }

  function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    askedPermissionRef.current = true;
    Notification.requestPermission().then(setNotifPermission);
  }

  // Whenever a *new* pending proposal from the partner shows up, surface
  // both an in-page banner and (if permitted) a real OS notification -
  // the latter covers the case where this tab isn't focused/visible.
  useEffect(() => {
    if (seenPendingIds.current.size === 0 && proposals.length > 0) {
      // First load: mark everything already sitting there as "seen" so
      // opening the page doesn't re-announce old pending proposals.
      proposals.forEach((p) => seenPendingIds.current.add(p.id));
      return;
    }
    for (const p of proposals) {
      if (p.proposedBy === whoAmI || p.status !== "pending") continue;
      if (seenPendingIds.current.has(p.id)) continue;
      seenPendingIds.current.add(p.id);
      const at = p.at.toDate();
      const text = `${otherName} suggested ${fmtDay(at, myTimezone)}, ${fmtTime(at, myTimezone)} (your time)`;
      setNotice(text);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Watch time suggested 🐾", { body: text });
      }
    }
  }, [proposals, whoAmI, otherName, myTimezone]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  function proposalForDay(dateKey: string): Proposal | null {
    return proposals.find((p) => dateKeyInZone(p.at.toDate(), myTimezone) === dateKey) ?? null;
  }

  const pendingFromPartner = proposals.find((p) => p.proposedBy !== whoAmI && p.status === "pending");

  async function propose(dateKey: string, hour: number, minute: number) {
    const db = getDb();
    if (!db) return;
    ensureNotificationPermission();
    const utcMillis = zonedTimeToUtcMillis(dateKey, `${pad(hour)}:${pad(minute)}`, myTimezone);
    await addDoc(collection(db, SCHEDULE_COLLECTION), {
      at: Timestamp.fromMillis(utcMillis),
      proposedBy: whoAmI,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setNotice(`You suggested ${fmtDayFromKey(dateKey)}, ${pad(hour)}:${pad(minute)} (your time)`);
  }

  async function agree(p: Proposal) {
    const db = getDb();
    if (!db) return;
    await updateDoc(doc(db, SCHEDULE_COLLECTION, p.id), { status: "agreed" });
  }

  async function withdraw(p: Proposal) {
    const db = getDb();
    if (!db) return;
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, p.id));
  }

  if (!connected) return null; // nothing to coordinate without a shared backend

  return (
    <div className="card-surface overflow-hidden p-0">
      {/* toast for a fresh proposal (either side) */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 border-b border-line bg-thread/[0.06] px-5 py-2.5 text-xs text-thread dark:border-line-dark"
          >
            <Bell className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex w-full items-center justify-between gap-3 px-5 py-4">
        <button onClick={() => setExpanded((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
          <span className="font-medium">When are we watching?</span>
          {!expanded && pendingFromPartner && (
            <span className="truncate text-xs text-thread">
              {otherName} suggested {fmtDay(pendingFromPartner.at.toDate(), myTimezone)},{" "}
              {fmtTime(pendingFromPartner.at.toDate(), myTimezone)} - waiting on you
            </span>
          )}
        </button>
        <span className="flex shrink-0 items-center gap-1">
          {notifPermission !== "unsupported" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (notifPermission === "default") requestNotifications();
              }}
              title={
                notifPermission === "granted"
                  ? "Browser notifications are on"
                  : notifPermission === "denied"
                    ? "Notifications blocked - enable them for this site in your browser settings"
                    : "Turn on browser notifications for new suggestions"
              }
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors",
                notifPermission === "granted"
                  ? "border-thread text-thread"
                  : notifPermission === "denied"
                    ? "border-line text-mist/50"
                    : "border-line text-mist hover:border-thread hover:text-thread dark:border-line-dark"
              )}
            >
              {notifPermission === "granted" ? (
                <BellRing className="h-3.5 w-3.5" />
              ) : notifPermission === "denied" ? (
                <BellOff className="h-3.5 w-3.5" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button onClick={() => setExpanded((v) => !v)} className="grid h-8 w-8 place-items-center">
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-mist transition-transform", expanded && "rotate-180")} />
          </button>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-5 pb-5 pt-4 dark:border-line-dark">
              <div className="relative w-full" style={{ aspectRatio: "600/150" }}>
                {/* paw trail between the day markers */}
                <div className="pointer-events-none absolute inset-0">
                  {days.slice(0, -1).map((_, i) => {
                    const x1 = 40 + (i * 520) / (DAYS_AHEAD - 1);
                    const x2 = 40 + ((i + 1) * 520) / (DAYS_AHEAD - 1);
                    const y1 = 75 + (i % 2 === 0 ? -25 : 25);
                    const y2 = 75 + ((i + 1) % 2 === 0 ? -25 : 25);
                    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                    return [0.25, 0.5, 0.75].map((t, j) => {
                      const bx = x1 + (x2 - x1) * t;
                      const by = y1 + (y2 - y1) * t;
                      const perp = j % 2 === 0 ? -7 : 7;
                      const nx = bx - Math.sin((angle * Math.PI) / 180) * perp;
                      const ny = by + Math.cos((angle * Math.PI) / 180) * perp;
                      return (
                        <span
                          key={`${i}-${j}`}
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${(nx / 600) * 100}%`, top: `${(ny / 150) * 100}%` }}
                        >
                          <SmallPaw angle={angle + 90} />
                        </span>
                      );
                    });
                  })}
                </div>

                {days.map((dateKey, i) => {
                  const p = proposalForDay(dateKey);
                  const x = 40 + (i * 520) / (DAYS_AHEAD - 1);
                  const y = 75 + (i % 2 === 0 ? -25 : 25);
                  const hasIcon = Boolean(p);
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setOpenIdx(i)}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                      style={{ left: `${(x / 600) * 100}%`, top: `${(y / 150) * 100}%` }}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-full border transition-colors",
                          hasIcon
                            ? "border-[#F0997B] bg-[#FAECE7]"
                            : "border-line bg-[var(--season-surface,transparent)] dark:border-line-dark"
                        )}
                      >
                        {!p ? <YarnBall /> : p.status === "agreed" ? <CatFace /> : <CatFull />}
                      </span>
                      <span className="text-[11px] text-mist">{fmtDayFromKey(dateKey)}</span>
                    </button>
                  );
                })}
              </div>

              {openIdx !== null && (
                <div className="mt-3 rounded-[var(--season-radius-sm)] border border-line bg-white/40 p-4 dark:border-line-dark dark:bg-white/[0.04]">
                  {(() => {
                    const dateKey = days[openIdx];
                    const p = proposalForDay(dateKey);

                    if (!p) {
                      return (
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{fmtDayFromKey(dateKey)}</p>
                            <span className="text-xs text-mist">Your time ({myTimezone})</span>
                          </div>
                          <TimePicker
                            hour={draftHour}
                            minute={draftMinute}
                            onChange={(h, m) => {
                              setDraftHour(h);
                              setDraftMinute(m);
                            }}
                          />
                          <button
                            onClick={() => propose(dateKey, draftHour, draftMinute)}
                            className="mt-3 w-full rounded-full bg-thread px-4 py-2 text-sm font-medium text-white dark:text-black sm:w-auto"
                          >
                            Suggest {pad(draftHour)}:{pad(draftMinute)}
                          </button>
                        </div>
                      );
                    }

                    const at = p.at.toDate();
                    const isMine = p.proposedBy === whoAmI;
                    const proposerName = isMine ? "You" : otherName;
                    const proposerTz = isMine ? myTimezone : theirTimezone;
                    const respondentName = isMine ? otherName : "You";
                    const respondentTz = isMine ? theirTimezone : myTimezone;

                    return (
                      <div>
                        <p className="mb-2 text-sm font-medium">{fmtDayFromKey(dateKey)}</p>
                        <p className="text-xs text-mist">
                          {proposerName}: {fmtDay(at, proposerTz)}, {fmtTime(at, proposerTz)}{" "}
                          {isMine ? "(your time)" : "(their time)"}
                        </p>
                        <p className="mb-3 text-xs text-mist">
                          {respondentName}: {fmtDay(at, respondentTz)}, {fmtTime(at, respondentTz)}{" "}
                          {isMine ? "(their time)" : "(your time)"}
                        </p>
                        {p.status === "agreed" ? (
                          <div>
                            <p className="mb-2 text-sm text-[#993C1D]">Agreed 🐾</p>
                            <button
                              onClick={() => withdraw(p)}
                              className="rounded-full border border-line px-4 py-1.5 text-sm text-mist hover:border-thread hover:text-thread dark:border-line-dark"
                            >
                              Reset - plans changed
                            </button>
                          </div>
                        ) : isMine ? (
                          <p className="text-xs text-mist">Waiting on {otherName}...</p>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => agree(p)}
                              className="rounded-full bg-thread px-4 py-1.5 text-sm font-medium text-white dark:text-black"
                            >
                              Agreed
                            </button>
                            <button
                              onClick={() => withdraw(p)}
                              className="rounded-full border border-line px-4 py-1.5 text-sm text-mist hover:border-thread hover:text-thread dark:border-line-dark"
                            >
                              Suggest my own time
                            </button>
                          </div>
                        )}
                        {p.status === "pending" && isMine && (
                          <button
                            onClick={() => withdraw(p)}
                            className="mt-2 text-xs text-mist underline underline-offset-2"
                          >
                            Cancel suggestion
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
