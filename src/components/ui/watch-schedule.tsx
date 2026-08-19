"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
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

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtTime(d: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(d);
}

function fmtDay(d: Date, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", timeZone: timezone }).format(d);
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
  const myName = whoAmI === "a" ? nameA : nameB;
  const otherName = whoAmI === "a" ? nameB : nameA;

  const [expanded, setExpanded] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [draftTime, setDraftTime] = useState("19:00");

  // Rolling window: always "today + next 6 days" as computed right now -
  // there's nothing to roll over manually, it's just today's date read
  // fresh on every render/mount.
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    const q = query(
      collection(db, SCHEDULE_COLLECTION),
      where("at", ">=", Timestamp.fromDate(startOfDay(new Date()))),
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

  function proposalForDay(d: Date): Proposal | null {
    return proposals.find((p) => dayKey(p.at.toDate()) === dayKey(d)) ?? null;
  }

  const pendingFromPartner = proposals.find((p) => p.proposedBy !== whoAmI && p.status === "pending");

  async function propose(d: Date, time: string) {
    const db = getDb();
    if (!db) return;
    const [hh, mm] = time.split(":").map(Number);
    const at = new Date(d);
    at.setHours(hh || 0, mm || 0, 0, 0);
    await addDoc(collection(db, SCHEDULE_COLLECTION), {
      at: Timestamp.fromDate(at),
      proposedBy: whoAmI,
      status: "pending",
      createdAt: serverTimestamp(),
    });
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
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm">
          <span className="font-medium">Когда смотрим?</span>
          {!expanded && pendingFromPartner && (
            <span className="truncate text-xs text-thread">
              {otherName} предложила {fmtDay(pendingFromPartner.at.toDate())},{" "}
              {fmtTime(pendingFromPartner.at.toDate())} — жду ответа
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-mist transition-transform", expanded && "rotate-180")} />
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

                {days.map((d, i) => {
                  const p = proposalForDay(d);
                  const x = 40 + (i * 520) / (DAYS_AHEAD - 1);
                  const y = 75 + (i % 2 === 0 ? -25 : 25);
                  const hasIcon = Boolean(p);
                  return (
                    <button
                      key={dayKey(d)}
                      onClick={() => setOpenIdx(i)}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                      style={{ left: `${(x / 600) * 100}%`, top: `${(y / 150) * 100}%` }}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-full border transition-colors",
                          hasIcon ? "border-[#F0997B] bg-[#FAECE7]" : "border-line bg-[var(--season-surface,transparent)] dark:border-line-dark"
                        )}
                      >
                        {!p ? <YarnBall /> : p.status === "agreed" ? <CatFace /> : <CatFull />}
                      </span>
                      <span className="text-[11px] text-mist">{fmtDay(d)}</span>
                    </button>
                  );
                })}
              </div>

              {openIdx !== null && (
                <div className="mt-3 rounded-[var(--season-radius-sm)] border border-line bg-white/40 p-4 dark:border-line-dark dark:bg-white/[0.04]">
                  {(() => {
                    const d = days[openIdx];
                    const p = proposalForDay(d);

                    if (!p) {
                      return (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{fmtDay(d)}</p>
                          <input
                            type="time"
                            value={draftTime}
                            onChange={(e) => setDraftTime(e.target.value)}
                            className="ml-auto rounded-full border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-thread dark:border-line-dark"
                          />
                          <button
                            onClick={() => propose(d, draftTime)}
                            className="rounded-full bg-thread px-4 py-1.5 text-sm font-medium text-white dark:text-black"
                          >
                            Предложить
                          </button>
                        </div>
                      );
                    }

                    const at = p.at.toDate();
                    const proposerName = p.proposedBy === "a" ? nameA : nameB;
                    const proposerTz = p.proposedBy === "a" ? timezoneA : timezoneB;
                    const otherTz = p.proposedBy === "a" ? timezoneB : timezoneA;
                    const respondentName = p.proposedBy === "a" ? nameB : nameA;

                    return (
                      <div>
                        <p className="mb-2 text-sm font-medium">{fmtDay(d)}</p>
                        <p className="text-xs text-mist">
                          {proposerName}: {fmtDay(at, proposerTz)}, {fmtTime(at, proposerTz)} (её/его время)
                        </p>
                        <p className="mb-3 text-xs text-mist">
                          {respondentName}: {fmtDay(at, otherTz)}, {fmtTime(at, otherTz)} (твоё время)
                        </p>
                        {p.status === "agreed" ? (
                          <p className="text-sm text-[#993C1D]">Договорились 🐾</p>
                        ) : p.proposedBy === whoAmI ? (
                          <p className="text-xs text-mist">Ждём ответа от {otherName}...</p>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => agree(p)}
                              className="rounded-full bg-thread px-4 py-1.5 text-sm font-medium text-white dark:text-black"
                            >
                              Согласен(на)
                            </button>
                            <button
                              onClick={() => withdraw(p)}
                              className="rounded-full border border-line px-4 py-1.5 text-sm text-mist hover:border-thread hover:text-thread dark:border-line-dark"
                            >
                              Своё время
                            </button>
                          </div>
                        )}
                        {p.status === "pending" && p.proposedBy === whoAmI && (
                          <button onClick={() => withdraw(p)} className="mt-2 text-xs text-mist underline underline-offset-2">
                            Отменить предложение
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
