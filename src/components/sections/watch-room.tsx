"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Link2, Check, Users, Bell, RefreshCw } from "lucide-react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { site } from "@/lib/site-config";
import { cn } from "@/lib/utils";

// Firestore doc shape - single shared "room" document. Two people only, so
// no need for a collection of rooms; one document is the whole feature.
type RoomState = {
  driveLink: string;
  fileId: string;
  title: string;
  setBy: string;
  readyA: boolean;
  readyB: boolean;
  countdownStartedAt: Timestamp | null;
  pauseSignalBy: string | null;
  pauseSignalAt: Timestamp | null;
};

const EMPTY_ROOM: RoomState = {
  driveLink: "",
  fileId: "",
  title: "",
  setBy: "",
  readyA: false,
  readyB: false,
  countdownStartedAt: null,
  pauseSignalBy: null,
  pauseSignalAt: null,
};

const ROOM_PATH = ["watchRoom", "room"] as const;
const WHOAMI_KEY = "twostory-watch-whoami";
const COUNTDOWN_SECONDS = 5;

// Accepts the common share-link shapes Drive produces and pulls the file id
// out of any of them:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=download
function extractDriveFileId(url: string): string | null {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export function WatchRoom() {
  const [connected] = useState(isFirebaseConfigured);
  const [room, setRoom] = useState<RoomState>(EMPTY_ROOM);
  const [linkInput, setLinkInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [whoAmI, setWhoAmI] = useState<"a" | "b" | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pauseBanner, setPauseBanner] = useState(false);
  const seenPauseSignalRef = useRef<number | null>(null);

  const people = site.people;
  const nameA = people[0]?.name ?? "A";
  const nameB = people[1]?.name ?? "B";

  useEffect(() => {
    const saved = window.localStorage.getItem(WHOAMI_KEY);
    if (saved === "a" || saved === "b") setWhoAmI(saved);
  }, []);

  function pickWho(who: "a" | "b") {
    setWhoAmI(who);
    window.localStorage.setItem(WHOAMI_KEY, who);
  }

  // Live subscription to the shared room doc. Falls back to local-only
  // state (same spirit as the guestbook) when Firebase isn't configured -
  // still fully usable solo, just not synced with a partner.
  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    const ref = doc(db, ...ROOM_PATH);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setRoom({ ...EMPTY_ROOM, ...(snap.data() as Partial<RoomState>) });
      }
    });
    return () => unsub();
  }, [connected]);

  async function writeRoom(patch: Partial<RoomState>) {
    const next = { ...room, ...patch };
    setRoom(next);
    if (!connected) return; // local-only mode: state above is the source of truth
    const db = getDb();
    if (!db) return;
    await setDoc(doc(db, ...ROOM_PATH), patch, { merge: true });
  }

  function handleSetFilm() {
    const id = extractDriveFileId(linkInput.trim());
    if (!id) {
      setLinkError("Doesn't look like a Google Drive link. Paste the \"Share\" link for the file.");
      return;
    }
    setLinkError(null);
    writeRoom({
      driveLink: linkInput.trim(),
      fileId: id,
      title: titleInput.trim() || "Untitled",
      setBy: whoAmI === "a" ? nameA : whoAmI === "b" ? nameB : "",
      readyA: false,
      readyB: false,
      countdownStartedAt: null,
    });
    setLinkInput("");
    setTitleInput("");
  }

  function toggleReady() {
    if (!whoAmI) return;
    if (whoAmI === "a") writeRoom({ readyA: !room.readyA });
    else writeRoom({ readyB: !room.readyB });
  }

  const bothReady = room.readyA && room.readyB;

  function startCountdown() {
    writeRoom({ countdownStartedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp) });
  }

  // Drive countdowns the visible timer off the timestamp written to
  // Firestore, so both browsers land on (roughly) the same second even
  // though each is running its own local interval.
  useEffect(() => {
    if (!room.countdownStartedAt) {
      setCountdown(null);
      return;
    }
    const startMs =
      typeof (room.countdownStartedAt as unknown as { toMillis?: () => number }).toMillis === "function"
        ? (room.countdownStartedAt as unknown as { toMillis: () => number }).toMillis()
        : new Date(room.countdownStartedAt as unknown as string).getTime();

    const tick = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.ceil(COUNTDOWN_SECONDS - elapsed);
      setCountdown(remaining > 0 ? remaining : 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room.countdownStartedAt]);

  function sendPauseSignal() {
    if (!whoAmI) return;
    writeRoom({
      pauseSignalBy: whoAmI === "a" ? nameA : nameB,
      pauseSignalAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  useEffect(() => {
    if (!room.pauseSignalAt) return;
    const stamp =
      typeof (room.pauseSignalAt as unknown as { toMillis?: () => number }).toMillis === "function"
        ? (room.pauseSignalAt as unknown as { toMillis: () => number }).toMillis()
        : new Date(room.pauseSignalAt as unknown as string).getTime();
    if (seenPauseSignalRef.current === stamp) return;
    seenPauseSignalRef.current = stamp;
    setPauseBanner(true);
    const t = setTimeout(() => setPauseBanner(false), 6000);
    return () => clearTimeout(t);
  }, [room.pauseSignalAt]);

  function resetRoom() {
    writeRoom({ readyA: false, readyB: false, countdownStartedAt: null });
  }

  const embedUrl = useMemo(
    () => (room.fileId ? `https://drive.google.com/file/d/${room.fileId}/preview` : null),
    [room.fileId]
  );

  return (
    <div className="space-y-8">
      {!connected && (
        <div className="rounded-[var(--season-radius-sm)] border border-dashed border-line bg-thread/[0.04] p-4 text-sm text-mist dark:border-line-dark">
          Firebase isn&apos;t connected yet, so this runs in local-only preview mode - the film picker and
          player work, but ready-checks and the synced countdown won&apos;t reach your partner&apos;s browser
          until Firebase is configured (see <code className="font-mono">.env.example</code>).
        </div>
      )}

      {/* who am I */}
      {!whoAmI && (
        <div className="rounded-[var(--season-radius-sm)] border border-line p-6 dark:border-line-dark">
          <p className="eyebrow mb-4">Before we start</p>
          <p className="mb-4 text-sm text-mist">Which one of you is this?</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => pickWho("a")}
              className="rounded-full border border-line px-5 py-2 text-sm transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
            >
              {nameA}
            </button>
            <button
              onClick={() => pickWho("b")}
              className="rounded-full border border-line px-5 py-2 text-sm transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
            >
              {nameB}
            </button>
          </div>
        </div>
      )}

      {whoAmI && (
        <>
          {/* set / change film */}
          <div className="rounded-[var(--season-radius-sm)] border border-line p-6 dark:border-line-dark">
            <p className="eyebrow mb-4 flex items-center gap-2">
              <Film className="h-3.5 w-3.5" /> {room.fileId ? "Change the film" : "Pick a film"}
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="Google Drive share link"
                  className="w-full rounded-full border border-line bg-transparent py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-thread dark:border-line-dark"
                />
              </div>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-full border border-line bg-transparent px-4 py-2 text-sm outline-none transition-colors focus:border-thread dark:border-line-dark"
              />
              <button
                onClick={handleSetFilm}
                disabled={!linkInput.trim()}
                className="rounded-full bg-thread px-5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Set
              </button>
            </div>
            {linkError && <p className="mt-3 text-xs text-red-500">{linkError}</p>}
            <p className="mt-3 text-xs text-mist">
              The file needs to be shared as &quot;Anyone with the link can view&quot; in Drive, or the embed
              below will show an access error.
            </p>
          </div>

          {/* player + sync controls */}
          {embedUrl ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Now playing</p>
                  <h3 className="font-display text-xl">{room.title || "Untitled"}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={sendPauseSignal}
                    className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
                  >
                    <Bell className="h-3.5 w-3.5" /> I paused
                  </button>
                  <button
                    onClick={resetRoom}
                    className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Reset ready-check
                  </button>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-[var(--season-radius)] border border-line bg-black dark:border-line-dark">
                <iframe
                  src={embedUrl}
                  allow="autoplay"
                  className="h-full w-full"
                  title={room.title || "Shared film"}
                />

                <AnimatePresence>
                  {countdown !== null && countdown > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm"
                    >
                      <div className="text-center text-white">
                        <p className="font-display text-6xl">{countdown}</p>
                        <p className="mt-2 text-sm text-white/70">Press play together...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {pauseBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="absolute inset-x-3 top-3 rounded-full bg-white/90 px-4 py-2 text-center text-xs text-ink shadow-lg dark:bg-black/80 dark:text-paper"
                    >
                      {room.pauseSignalBy} paused - pause on your side too
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ready check */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--season-radius-sm)] border border-line p-5 dark:border-line-dark">
                <div className="flex items-center gap-6">
                  <ReadyPill label={nameA} ready={room.readyA} />
                  <ReadyPill label={nameB} ready={room.readyB} />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleReady}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-5 py-2 text-sm transition-colors",
                      (whoAmI === "a" ? room.readyA : room.readyB)
                        ? "bg-thread text-white"
                        : "border border-line hover:border-thread hover:text-thread dark:border-line-dark"
                    )}
                  >
                    <Check className="h-4 w-4" />
                    {(whoAmI === "a" ? room.readyA : room.readyB) ? "Ready" : "I'm ready"}
                  </button>
                  {bothReady && countdown === null && (
                    <button
                      onClick={startCountdown}
                      className="flex items-center gap-2 rounded-full bg-thread px-5 py-2 text-sm text-white transition-opacity hover:opacity-90"
                    >
                      <Users className="h-4 w-4" /> Start together
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-mist">
                Drive&apos;s player can&apos;t be controlled remotely, so this can&apos;t auto-sync play, pause,
                or seeking mid-film - the ready-check and countdown just get you both pressing play at the same
                moment, and &quot;I paused&quot; nudges the other side when you stop.
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--season-radius-sm)] border border-dashed border-line p-10 text-center text-sm text-mist dark:border-line-dark">
              No film set yet. Paste a Drive link above to start.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReadyPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("h-2 w-2 rounded-full", ready ? "bg-thread" : "bg-line dark:bg-line-dark")} />
      <span className={ready ? "text-ink dark:text-paper" : "text-mist"}>{label}</span>
    </div>
  );
}
