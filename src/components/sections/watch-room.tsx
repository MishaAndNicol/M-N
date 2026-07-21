"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Link2, Users, ListPlus, Play, Trash2, AlertTriangle } from "lucide-react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { buildDriveMediaUrl } from "@/lib/drive";
import { site } from "@/lib/site-config";
import { cn } from "@/lib/utils";

// A single entry in the shared playlist - just enough to show a title in
// the list and re-hydrate the player when picked.
type Episode = {
  id: string;
  title: string;
  driveLink: string;
  fileId: string;
};

// Firestore doc shape - single shared "room" document. Two people only, so
// no need for a collection of rooms; one document is the whole feature.
//
// `playing` / `positionSeconds` / `syncBy` / `syncUpdatedAt` are the real
// playback-sync state: whichever side presses play, pauses, or seeks writes
// these fields, and the other side's <video> element reacts to the change.
// `syncBy` lets a client recognize its own writes coming back through the
// snapshot listener so it doesn't re-apply them to itself.
type RoomState = {
  driveLink: string;
  fileId: string;
  title: string;
  setBy: string;
  playing: boolean;
  positionSeconds: number;
  syncBy: string | null;
  syncUpdatedAt: Timestamp | null;
  playlist: Episode[];
};

const EMPTY_ROOM: RoomState = {
  driveLink: "",
  fileId: "",
  title: "",
  setBy: "",
  playing: false,
  positionSeconds: 0,
  syncBy: null,
  syncUpdatedAt: null,
  playlist: [],
};

const ROOM_PATH = ["watchRoom", "room"] as const;
const WHOAMI_KEY = "twostory-watch-whoami";
// If a remote update and our local playback position differ by more than
// this, we jump instead of letting it drift back in sync on its own.
const RESYNC_THRESHOLD_SECONDS = 1.5;

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

// Turns pasted text (one episode per line) into Episode objects. Accepts a
// bare link, or "Title - link" / "Title | link" / "Title, link" - anything
// with the link at the end of the line after a separator. Lines that don't
// contain a recognizable Drive link are reported back as errors instead of
// silently dropped.
function parseBulkLinks(text: string, startIndex: number): { episodes: Episode[]; errors: string[] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const episodes: Episode[] = [];
  const errors: string[] = [];

  lines.forEach((line, i) => {
    const sepMatch = line.match(/^(.*?)\s*[-|,]\s*(https?:\/\/\S+)$/);
    const title = sepMatch ? sepMatch[1].trim() : "";
    const link = sepMatch ? sepMatch[2].trim() : line;

    const fileId = extractDriveFileId(link);
    if (!fileId) {
      errors.push(`Строка ${i + 1}: «${line.slice(0, 60)}» — не похоже на ссылку Google Drive`);
      return;
    }

    episodes.push({
      id: `${Date.now()}-${startIndex + i}-${Math.random().toString(36).slice(2, 7)}`,
      title: title || `Серия ${startIndex + episodes.length + 1}`,
      driveLink: link,
      fileId,
    });
  });

  return { episodes, errors };
}

function timestampToMillis(ts: Timestamp | null): number | null {
  if (!ts) return null;
  const withToMillis = ts as unknown as { toMillis?: () => number };
  if (typeof withToMillis.toMillis === "function") return withToMillis.toMillis();
  const parsed = new Date(ts as unknown as string).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function WatchRoom() {
  const [connected] = useState(isFirebaseConfigured);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const [room, setRoom] = useState<RoomState>(EMPTY_ROOM);
  const [linkInput, setLinkInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkAddedCount, setBulkAddedCount] = useState<number | null>(null);
  const [whoAmI, setWhoAmI] = useState<"a" | "b" | null>(null);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Set right before we programmatically call play()/pause()/seek in
  // response to a remote update, so the resulting native play/pause/seeked
  // events on the <video> element don't get written straight back to
  // Firestore as if the local user had done them (which would otherwise
  // bounce the two clients back and forth).
  const applyingRemoteRef = useRef(false);
  // Last syncUpdatedAt (as millis) we've already applied, so re-renders
  // triggered by unrelated room fields don't reprocess the same event.
  const lastAppliedSyncRef = useRef<number | null>(null);

  const people = site.people;
  const nameA = people[0]?.name ?? "A";
  const nameB = people[1]?.name ?? "B";
  const myName = whoAmI === "a" ? nameA : whoAmI === "b" ? nameB : "";

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
    setVideoError(false);
    writeRoom({
      driveLink: linkInput.trim(),
      fileId: id,
      title: titleInput.trim() || "Untitled",
      setBy: myName,
      playing: false,
      positionSeconds: 0,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
    setLinkInput("");
    setTitleInput("");
  }

  function handleBulkAdd() {
    const { episodes, errors } = parseBulkLinks(bulkInput, room.playlist.length);
    setBulkErrors(errors);
    if (episodes.length) {
      writeRoom({ playlist: [...room.playlist, ...episodes] });
      setBulkInput("");
      setBulkAddedCount(episodes.length);
      setTimeout(() => setBulkAddedCount(null), 4000);
    }
  }

  function playEpisode(ep: Episode) {
    setVideoError(false);
    writeRoom({
      driveLink: ep.driveLink,
      fileId: ep.fileId,
      title: ep.title,
      setBy: myName,
      playing: false,
      positionSeconds: 0,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  function removeEpisode(id: string) {
    writeRoom({ playlist: room.playlist.filter((ep) => ep.id !== id) });
  }

  const mediaUrl = useMemo(
    () => (room.fileId && apiKey ? buildDriveMediaUrl(room.fileId, apiKey) : null),
    [room.fileId, apiKey]
  );

  // Reacts to playback state written by the *other* side. Our own writes
  // come back through this same listener (Firestore doesn't distinguish
  // "who wrote this"), so we skip anything tagged with our own name -
  // that side already applied the change directly through the native
  // play()/pause() call that triggered the write in the first place.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room.fileId) return;
    if (room.syncBy === myName || !room.syncBy) return;

    const stampMs = timestampToMillis(room.syncUpdatedAt);
    if (stampMs !== null && lastAppliedSyncRef.current === stampMs) return;
    if (stampMs !== null) lastAppliedSyncRef.current = stampMs;

    const elapsedSinceWrite = room.playing && stampMs ? Math.max(0, (Date.now() - stampMs) / 1000) : 0;
    const targetPosition = room.positionSeconds + elapsedSinceWrite;

    applyingRemoteRef.current = true;
    if (Math.abs(video.currentTime - targetPosition) > RESYNC_THRESHOLD_SECONDS) {
      video.currentTime = targetPosition;
    }
    if (room.playing && video.paused) {
      video.play().catch(() => setVideoError(true));
    } else if (!room.playing && !video.paused) {
      video.pause();
    }
    // Native events fire asynchronously; give them a tick to land as
    // "remote-applied" before treating further events as local again.
    const clear = setTimeout(() => {
      applyingRemoteRef.current = false;
    }, 150);
    return () => clearTimeout(clear);
  }, [room.playing, room.positionSeconds, room.syncBy, room.syncUpdatedAt, room.fileId, myName]);

  function handleLocalPlay() {
    if (applyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    writeRoom({
      playing: true,
      positionSeconds: video.currentTime,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  function handleLocalPause() {
    if (applyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    writeRoom({
      playing: false,
      positionSeconds: video.currentTime,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  // Scrubbing the seek bar fires "seeked" once the jump settles - synced
  // the same way as play/pause so skipping ahead lands both sides together.
  function handleLocalSeeked() {
    if (applyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    writeRoom({
      positionSeconds: video.currentTime,
      playing: !video.paused,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  return (
    <div className="space-y-8">
      {!connected && (
        <div className="rounded-[var(--season-radius-sm)] border border-dashed border-line bg-thread/[0.04] p-4 text-sm text-mist dark:border-line-dark">
          Firebase isn&apos;t connected yet, so this runs in local-only preview mode - the film picker and
          player work, but play/pause/seek won&apos;t reach your partner&apos;s browser until Firebase is
          configured (see <code className="font-mono">.env.example</code>).
        </div>
      )}

      {!apiKey && (
        <div className="flex items-start gap-2 rounded-[var(--season-radius-sm)] border border-dashed border-line bg-thread/[0.04] p-4 text-sm text-mist dark:border-line-dark">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No Drive API key set (<code className="font-mono">NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY</code>), so
            the player can&apos;t load film bytes yet - see <code className="font-mono">.env.example</code>.
          </span>
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
              The file needs to be shared as &quot;Anyone with the link can view&quot; in Drive, or streaming
              below will show an access error.
            </p>
          </div>

          {/* bulk-add many episodes at once */}
          <div className="rounded-[var(--season-radius-sm)] border border-line p-6 dark:border-line-dark">
            <p className="eyebrow mb-4 flex items-center gap-2">
              <ListPlus className="h-3.5 w-3.5" /> Add a whole season at once
            </p>
            <p className="mb-3 text-xs text-mist">
              Paste one link per line. Optionally add a title before it, separated by{" "}
              <code className="font-mono">-</code>, <code className="font-mono">|</code>, or{" "}
              <code className="font-mono">,</code> — e.g.{" "}
              <code className="font-mono">Episode 1 - https://drive.google.com/file/d/.../view</code>. A bare
              link on its own line works too; it&apos;ll be numbered automatically.
            </p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={"Episode 1 - https://drive.google.com/file/d/FILE_ID_1/view\nEpisode 2 - https://drive.google.com/file/d/FILE_ID_2/view\n..."}
              rows={5}
              className="w-full rounded-[var(--season-radius-sm)] border border-line bg-transparent p-3 font-mono text-xs outline-none transition-colors focus:border-thread dark:border-line-dark"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleBulkAdd}
                disabled={!bulkInput.trim()}
                className="rounded-full bg-thread px-5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Add all
              </button>
              {bulkAddedCount !== null && (
                <span className="text-xs text-thread">Added {bulkAddedCount} episode(s) ✓</span>
              )}
            </div>
            {bulkErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {bulkErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* the playlist itself */}
          {room.playlist.length > 0 && (
            <div className="rounded-[var(--season-radius-sm)] border border-line p-6 dark:border-line-dark">
              <p className="eyebrow mb-4">Playlist ({room.playlist.length})</p>
              <ul className="space-y-2">
                {room.playlist.map((ep, i) => {
                  const isPlaying = ep.fileId === room.fileId;
                  return (
                    <li
                      key={ep.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-full border px-4 py-2 text-sm transition-colors",
                        isPlaying
                          ? "border-thread bg-thread/[0.06] text-thread"
                          : "border-line dark:border-line-dark"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-xs text-mist">{i + 1}.</span>
                        <span className="truncate">{ep.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => playEpisode(ep)}
                          title="Play this episode"
                          className="rounded-full p-1.5 transition-colors hover:bg-thread/10 hover:text-thread"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeEpisode(ep.id)}
                          title="Remove from playlist"
                          className="rounded-full p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* player */}
          {mediaUrl ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Now playing</p>
                  <h3 className="font-display text-xl">{room.title || "Untitled"}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-mist">
                  <Users className="h-3.5 w-3.5" />
                  {room.syncBy ? `последним управлял: ${room.syncBy}` : "готово к синхронному просмотру"}
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-[var(--season-radius)] border border-line bg-black dark:border-line-dark">
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  controls
                  className="h-full w-full"
                  onPlay={handleLocalPlay}
                  onPause={handleLocalPause}
                  onSeeked={handleLocalSeeked}
                  onError={() => setVideoError(true)}
                />

                <AnimatePresence>
                  {videoError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 grid place-items-center bg-black/70 p-6 text-center text-sm text-white"
                    >
                      Не удалось загрузить файл. Проверьте, что доступ в Drive открыт по ссылке
                      &quot;Anyone with the link&quot; и что API-ключ настроен и не ограничен другим доменом.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-xs text-mist">
                Play, pause и перемотка синхронизируются автоматически на обеих сторонах — не нужно жать
                play одновременно вручную. Если кто-то отстаёт больше чем на пару секунд (например, после
                разрыва соединения), плеер сам подстроит позицию при следующем действии партнёра.
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--season-radius-sm)] border border-dashed border-line p-10 text-center text-sm text-mist dark:border-line-dark">
              {room.fileId
                ? "Film is set, but no Drive API key is configured yet - see the note above."
                : "No film set yet. Paste a Drive link above to start."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
