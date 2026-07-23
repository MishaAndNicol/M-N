"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Link2,
  Users,
  ListPlus,
  Play,
  Trash2,
  AlertTriangle,
  MessageCircle,
  X,
  Maximize,
  Minimize,
  FolderPlus,
  Folder,
  SkipForward,
} from "lucide-react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { resolveVideoUrl, hasR2BaseUrl } from "@/lib/r2";
import { site } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { WatchChat } from "@/components/sections/watch-chat";
import { useUnreadWatchChatCount } from "@/lib/watch-chat";

// A single entry in the shared playlist - just enough to show a title in
// the list and re-hydrate the player when picked. `videoUrl` is always a
// fully-resolved https:// URL (resolved once, at add-time, via
// resolveVideoUrl) so playback never depends on env config changing later.
// `sectionId` groups it under one of `RoomState.sections` below - `null`
// means it sits in the unsorted "No section" group.
type Episode = {
  id: string;
  title: string;
  videoUrl: string;
  sectionId: string | null;
};

// A named grouping for the playlist - "Season 1", "Movies", whatever the
// two of them want to call it. Just a label; the episodes themselves carry
// the `sectionId` that puts them under it.
type Section = {
  id: string;
  title: string;
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
  videoUrl: string;
  title: string;
  setBy: string;
  playing: boolean;
  positionSeconds: number;
  syncBy: string | null;
  syncUpdatedAt: Timestamp | null;
  playlist: Episode[];
  sections: Section[];
};

const EMPTY_ROOM: RoomState = {
  videoUrl: "",
  title: "",
  setBy: "",
  playing: false,
  positionSeconds: 0,
  syncBy: null,
  syncUpdatedAt: null,
  playlist: [],
  sections: [],
};

const ROOM_PATH = ["watchRoom", "room"] as const;
const WHOAMI_KEY = "twostory-watch-whoami";
// If a remote update and our local playback position differ by more than
// this, we jump instead of letting it drift back in sync on its own.
const RESYNC_THRESHOLD_SECONDS = 1.5;

// Turns pasted text (one episode per line) into Episode objects. Accepts a
// bare R2 URL/key, or "Title - link" / "Title | link" / "Title, link" -
// anything with the link at the end of the line after a separator. Lines
// that don't resolve to a playable URL are reported back as errors instead
// of silently dropped.
function parseBulkLinks(
  text: string,
  startIndex: number,
  sectionId: string | null
): { episodes: Episode[]; errors: string[] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const episodes: Episode[] = [];
  const errors: string[] = [];

  lines.forEach((line, i) => {
    const sepMatch = line.match(/^(.*?)\s*[-|,]\s*(\S+)$/);
    const title = sepMatch ? sepMatch[1].trim() : "";
    const link = sepMatch ? sepMatch[2].trim() : line;

    const videoUrl = resolveVideoUrl(link);
    if (!videoUrl) {
      errors.push(
        `Строка ${i + 1}: «${line.slice(0, 60)}» — не похоже на ссылку/ключ R2 (и NEXT_PUBLIC_R2_PUBLIC_BASE_URL не настроен)`
      );
      return;
    }

    episodes.push({
      id: `${Date.now()}-${startIndex + i}-${Math.random().toString(36).slice(2, 7)}`,
      title: title || `Серия ${startIndex + episodes.length + 1}`,
      videoUrl,
      sectionId,
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
  const [room, setRoom] = useState<RoomState>(EMPTY_ROOM);
  const [linkInput, setLinkInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkAddedCount, setBulkAddedCount] = useState<number | null>(null);
  const [sectionTitleInput, setSectionTitleInput] = useState("");
  // Which section new episodes (single "Set" or bulk-add) get filed under.
  // "" is the sentinel for "no section" since <select> values are strings.
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [whoAmI, setWhoAmI] = useState<"a" | "b" | null>(null);
  const unreadChatCount = useUnreadWatchChatCount();
  const [videoError, setVideoError] = useState(false);
  // Chat starts closed - it opens over the player via the toggle button
  // instead of permanently occupying a column next to the video.
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Wraps the <video> + chat overlay + toggle button. This, not the
  // <video> element itself, is what we put into fullscreen - so the
  // chat and its button stay visible instead of disappearing along
  // with the rest of the page.
  const stageRef = useRef<HTMLDivElement>(null);
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

  // Tracks whether *our* stage wrapper (not the bare <video>) is the
  // fullscreen element, so the UI (button icon, styling) reflects it.
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Our own fullscreen control. Calling requestFullscreen() here, directly
  // inside the click handler, keeps it inside the same user gesture the
  // browser requires - unlike exiting the video's own fullscreen and then
  // re-requesting it on the wrapper afterwards, which several browsers
  // silently refuse once that extra async step has passed.
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      stageRef.current?.requestFullscreen().catch(() => {});
    }
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
    const videoUrl = resolveVideoUrl(linkInput.trim());
    if (!videoUrl) {
      setLinkError(
        hasR2BaseUrl()
          ? "Doesn't look like a URL or object key. Paste the public R2 URL, or just the file's key."
          : "Doesn't look like a URL. Paste the public R2 object URL (or set NEXT_PUBLIC_R2_PUBLIC_BASE_URL to allow pasting bare keys)."
      );
      return;
    }
    setLinkError(null);
    setVideoError(false);
    const title = titleInput.trim() || "Untitled";
    const sectionId = targetSectionId || null;
    // File it into the playlist too (under the chosen section) instead of
    // only setting it as "now playing" - otherwise anything added this way
    // would never show up grouped, or be reachable by "next episode".
    const alreadyInPlaylist = room.playlist.some((ep) => ep.videoUrl === videoUrl);
    const nextPlaylist = alreadyInPlaylist
      ? room.playlist
      : [...room.playlist, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, videoUrl, sectionId }];
    writeRoom({
      videoUrl,
      title,
      setBy: myName,
      playing: false,
      positionSeconds: 0,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
      playlist: nextPlaylist,
    });
    setLinkInput("");
    setTitleInput("");
  }

  function handleBulkAdd() {
    const { episodes, errors } = parseBulkLinks(bulkInput, room.playlist.length, targetSectionId || null);
    setBulkErrors(errors);
    if (episodes.length) {
      writeRoom({ playlist: [...room.playlist, ...episodes] });
      setBulkInput("");
      setBulkAddedCount(episodes.length);
      setTimeout(() => setBulkAddedCount(null), 4000);
    }
  }

  function addSection() {
    const title = sectionTitleInput.trim();
    if (!title) return;
    const section: Section = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title };
    writeRoom({ sections: [...room.sections, section] });
    setSectionTitleInput("");
    setTargetSectionId(section.id);
  }

  // Removing a section only removes the label - its episodes fall back to
  // "No section" instead of being deleted, so nothing in the playlist is
  // ever lost just from tidying up the grouping.
  function deleteSection(id: string) {
    writeRoom({
      sections: room.sections.filter((s) => s.id !== id),
      playlist: room.playlist.map((ep) => (ep.sectionId === id ? { ...ep, sectionId: null } : ep)),
    });
    if (targetSectionId === id) setTargetSectionId("");
  }

  function playEpisode(ep: Episode, opts?: { autoplay?: boolean }) {
    setVideoError(false);
    writeRoom({
      videoUrl: ep.videoUrl,
      title: ep.title,
      setBy: myName,
      playing: Boolean(opts?.autoplay),
      positionSeconds: 0,
      syncBy: myName,
      syncUpdatedAt: connected ? (serverTimestamp() as unknown as Timestamp) : (new Date() as unknown as Timestamp),
    });
  }

  function removeEpisode(id: string) {
    writeRoom({ playlist: room.playlist.filter((ep) => ep.id !== id) });
  }

  const mediaUrl = useMemo(() => (room.videoUrl ? room.videoUrl : null), [room.videoUrl]);

  // Playback order for "next episode": section by section, in the order
  // sections were created, then anything left ungrouped at the end -
  // rather than raw playlist-array order, which is just add order and can
  // jump between sections that were built up over time.
  const orderedEpisodes = useMemo(() => {
    const bySection = new Map<string, Episode[]>();
    const noSection: Episode[] = [];
    room.playlist.forEach((ep) => {
      if (ep.sectionId) {
        const arr = bySection.get(ep.sectionId) ?? [];
        arr.push(ep);
        bySection.set(ep.sectionId, arr);
      } else {
        noSection.push(ep);
      }
    });
    const ordered: Episode[] = [];
    room.sections.forEach((s) => ordered.push(...(bySection.get(s.id) ?? [])));
    ordered.push(...noSection);
    return ordered;
  }, [room.playlist, room.sections]);

  const currentEpisodeIndex = useMemo(
    () => orderedEpisodes.findIndex((ep) => ep.videoUrl === room.videoUrl),
    [orderedEpisodes, room.videoUrl]
  );
  const nextEpisode =
    currentEpisodeIndex !== -1 && currentEpisodeIndex + 1 < orderedEpisodes.length
      ? orderedEpisodes[currentEpisodeIndex + 1]
      : null;

  function playNextEpisode(opts?: { autoplay?: boolean }) {
    if (!nextEpisode) return;
    playEpisode(nextEpisode, opts);
  }

  // The side that triggers a videoUrl change (manual pick, "next episode"
  // button, or auto-advance on end) is the one whose <video> element needs
  // to actually call play() for an autoplay - the other side picks it up
  // through the normal remote-sync effect below.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room.videoUrl) return;
    if (room.syncBy !== myName) return;
    if (room.playing) {
      video.play().catch(() => setVideoError(true));
    }
    // Only re-run when the video actually changes - room.playing changes
    // are already handled by handleLocalPlay/handleLocalPause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.videoUrl]);

  function handleVideoEnded() {
    if (applyingRemoteRef.current) return;
    if (nextEpisode) {
      playNextEpisode({ autoplay: true });
    }
  }

  // Reacts to playback state written by the *other* side. Our own writes
  // come back through this same listener (Firestore doesn't distinguish
  // "who wrote this"), so we skip anything tagged with our own name -
  // that side already applied the change directly through the native
  // play()/pause() call that triggered the write in the first place.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room.videoUrl) return;
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
  }, [room.playing, room.positionSeconds, room.syncBy, room.syncUpdatedAt, room.videoUrl, myName]);

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

      {/* who am I */}
      {!whoAmI && (
        <div className="card-surface p-6">
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
        <div className="space-y-8">
          {/* set / change film */}
          <div className="card-surface p-6">
            <p className="eyebrow mb-4 flex items-center gap-2">
              <Film className="h-3.5 w-3.5" /> {room.videoUrl ? "Change the film" : "Pick a film"}
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="R2 public video URL (or object key)"
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
          </div>

          {/* sections - group the playlist instead of one long mixed list */}
          <div className="card-surface p-6">
            <p className="eyebrow mb-4 flex items-center gap-2">
              <FolderPlus className="h-3.5 w-3.5" /> Sections
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={sectionTitleInput}
                onChange={(e) => setSectionTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSection()}
                placeholder="e.g. Season 1, Movies..."
                className="min-w-[12rem] flex-1 rounded-full border border-line bg-transparent px-4 py-2 text-sm outline-none transition-colors focus:border-thread dark:border-line-dark"
              />
              <button
                onClick={addSection}
                disabled={!sectionTitleInput.trim()}
                className="rounded-full bg-thread px-5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Add section
              </button>
            </div>
            {room.sections.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-mist">Adding new episodes to:</span>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="rounded-full border border-line bg-transparent px-3 py-1.5 text-xs outline-none transition-colors focus:border-thread dark:border-line-dark"
                >
                  <option value="">No section</option>
                  {room.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* bulk-add many episodes at once */}
          <div className="card-surface p-6">
            <p className="eyebrow mb-4 flex items-center gap-2">
              <ListPlus className="h-3.5 w-3.5" /> Add a whole season at once
            </p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={"Episode 1 - https://pub-xxxx.r2.dev/episode-01.mp4\nEpisode 2 - https://pub-xxxx.r2.dev/episode-02.mp4\n..."}
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

          {/* the playlist itself, grouped into sections */}
          {room.playlist.length > 0 && (
            <div className="space-y-4">
              {(() => {
                const noSectionId = "__none__";
                const groups = new Map<string, Episode[]>();
                room.playlist.forEach((ep) => {
                  const key = ep.sectionId ?? noSectionId;
                  const arr = groups.get(key) ?? [];
                  arr.push(ep);
                  groups.set(key, arr);
                });
                const groupList: { id: string; title: string; episodes: Episode[] }[] = [
                  ...room.sections
                    .filter((s) => groups.has(s.id))
                    .map((s) => ({ id: s.id, title: s.title, episodes: groups.get(s.id)! })),
                  ...(groups.has(noSectionId)
                    ? [{ id: noSectionId, title: "No section", episodes: groups.get(noSectionId)! }]
                    : []),
                ];

                return groupList.map((group) => (
                  <div key={group.id} className="card-surface p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="eyebrow flex items-center gap-2">
                        <Folder className="h-3.5 w-3.5" /> {group.title} ({group.episodes.length})
                      </p>
                      {group.id !== noSectionId && (
                        <button
                          onClick={() => deleteSection(group.id)}
                          title="Delete section (keeps its episodes, ungrouped)"
                          className="rounded-full p-1.5 text-mist transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {group.episodes.map((ep, i) => {
                        const isPlaying = ep.videoUrl === room.videoUrl;
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
                                onClick={() => playEpisode(ep, { autoplay: room.playing })}
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
                ));
              })()}
            </div>
          )}

          {/* player. Full width now - the chat no longer sits in a
              permanent side column; it opens over the video via the
              toggle button instead, in both normal and fullscreen view. */}
          <div className="mt-6 space-y-4 lg:mt-10">
            {mediaUrl ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Now playing</p>
                    <h3 className="font-display text-xl">{room.title || "Untitled"}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-mist">
                      <Users className="h-3.5 w-3.5" />
                      {room.syncBy ? `последним управлял: ${room.syncBy}` : "готово к синхронному просмотру"}
                    </div>
                    {nextEpisode && (
                      <button
                        onClick={() => playNextEpisode({ autoplay: room.playing })}
                        title={`Next: ${nextEpisode.title}`}
                        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-thread hover:text-thread dark:border-line-dark"
                      >
                        <SkipForward className="h-3.5 w-3.5" /> Next episode
                      </button>
                    )}
                  </div>
                </div>

                {/* stageRef wraps the video, the chat toggle button, and
                    the chat overlay itself - it's this whole group that
                    goes fullscreen (see the fullscreenchange effect
                    above), so the chat stays reachable on the big screen
                    instead of disappearing along with the rest of the page. */}
                <div
                  ref={stageRef}
                  className={cn(
                    "relative aspect-video w-full overflow-hidden rounded-[var(--season-radius)] border border-line bg-black dark:border-line-dark lg:max-h-[75vh]",
                    isFullscreen && "!max-h-none rounded-none border-none"
                  )}
                >
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    controls
                    controlsList="nofullscreen"
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                    onPlay={handleLocalPlay}
                    onPause={handleLocalPause}
                    onSeeked={handleLocalSeeked}
                    onEnded={handleVideoEnded}
                    onError={() => setVideoError(true)}
                  />

                  {/* chat + fullscreen toggles - stay in the same corner of
                      the stage whether we're in the normal page layout or
                      fullscreen, since they live inside the element that
                      actually gets fullscreened. */}
                  <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
                    >
                      {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
                    </button>
                    <button
                      onClick={() => setShowChat((v) => !v)}
                      aria-label={showChat ? "Hide chat" : "Show chat"}
                      className={cn(
                        "relative grid h-10 w-10 place-items-center rounded-full backdrop-blur transition-colors",
                        showChat
                          ? "bg-thread text-white"
                          : "bg-black/50 text-white hover:bg-black/70"
                      )}
                    >
                      {showChat ? <X className="h-4.5 w-4.5" /> : <MessageCircle className="h-4.5 w-4.5" />}
                      {!showChat && unreadChatCount > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4.5 min-w-[1.125rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium leading-none text-white">
                          {unreadChatCount > 9 ? "9+" : unreadChatCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showChat && (
                      <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "tween", duration: 0.25 }}
                        className="absolute inset-y-0 right-0 z-10 w-full max-w-sm sm:w-96"
                      >
                        <WatchChat whoAmI={whoAmI} nameA={nameA} nameB={nameB} variant="overlay" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {videoError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute inset-0 grid place-items-center bg-black/70 p-6 text-center text-sm text-white"
                      >
                        Не удалось загрузить файл. Проверьте, что объект в R2 доступен публично (Public
                        Access включён для бакета или объекта) и что ссылка указывает на сам видеофайл.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-mist">
                  Play, pause и перемотка синхронизируются автоматически на обеих сторонах — не нужно жать
                  play одновременно вручную. Если кто-то отстаёт больше чем на пару секунд (например, после
                  разрыва соединения), плеер сам подстроит позицию при следующем действии партнёра. Кнопки
                  в углу — «на весь экран» и чат поверх видео; чат остаётся доступен и в полноэкранном режиме.
                </p>
              </div>
            ) : (
              <div className="rounded-[var(--season-radius-sm)] border border-dashed border-line p-10 text-center text-sm text-mist dark:border-line-dark">
                No film set yet. Paste an R2 video link above to start.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
