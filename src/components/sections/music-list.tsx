"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music2, ExternalLink, ChevronDown } from "lucide-react";
import { site } from "@/lib/site-config";
import { resolveR2Url } from "@/lib/r2";

const TRACK_LENGTH_S = 180; // Only used to animate the mock progress bar when no source is linked at all yet.

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicList() {
  const playlist = site.playlist;

  // Group tracks by artist, preserving each group's first-appearance order
  // in the underlying playlist array (so it matches site-config's order,
  // not alphabetical) - each group keeps the original playlist index so
  // the player state below still just works off a flat index.
  const groups = useMemo(() => {
    const byArtist = new Map<string, { title: string; index: number }[]>();
    playlist.forEach((track, index) => {
      const list = byArtist.get(track.artist) ?? [];
      list.push({ title: track.title, index });
      byArtist.set(track.artist, list);
    });
    return Array.from(byArtist.entries()).map(([artist, tracks]) => ({ artist, tracks }));
  }, [playlist]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Which artist group is expanded - starts on whichever group the first
  // track belongs to, so something is open by default instead of an empty
  // list of collapsed headers.
  const [openArtist, setOpenArtist] = useState<string | null>(playlist[0]?.artist ?? null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // mock-timer seconds, only used when there's no real source at all

  // Real <audio> playback state - only relevant for tracks with an audioUrl.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const active = playlist[activeIndex];
  // Own R2-hosted file takes priority - it's a real <audio> element we
  // fully control (play/pause/seek), unlike the embeds below which are
  // someone else's player running inside an iframe.
  const resolvedAudioUrl = useMemo(
    () => (active?.audioUrl ? resolveR2Url(active.audioUrl) : null),
    [active]
  );
  const hasAudioFile = Boolean(resolvedAudioUrl);
  const hasEmbed = !hasAudioFile && Boolean(active?.spotifyUrl || active?.youtubeUrl);

  // Track changed - reset everything and let the new <audio src> (if any)
  // load fresh. Doesn't auto-play; the person presses play same as before.
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    const audio = audioRef.current;
    if (audio) audio.pause();
  }, [activeIndex]);

  // Mock progress bar - only runs when there's genuinely nothing playable
  // linked yet, same as before this feature existed.
  useEffect(() => {
    if (!playing || hasEmbed || hasAudioFile) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= TRACK_LENGTH_S) {
          setPlaying(false);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, hasEmbed, hasAudioFile]);

  function togglePlay() {
    if (hasAudioFile) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        audio.play().catch(() => setAudioError(true));
      } else {
        audio.pause();
      }
      return;
    }
    setPlaying((p) => !p);
  }

  function seekTo(clientX: number, bar: HTMLDivElement) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  function playNext() {
    setActiveIndex((i) => (i + 1 < playlist.length ? i + 1 : i));
  }

  function selectTrack(index: number) {
    setActiveIndex(index);
    setOpenArtist(playlist[index]?.artist ?? null);
  }

  function toggleGroup(artist: string) {
    setOpenArtist((current) => (current === artist ? null : artist));
  }

  if (playlist.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mist dark:border-line-dark">
        No songs added yet.
      </p>
    );
  }

  const mm = String(Math.floor(progress / 60)).padStart(1, "0");
  const ss = String(progress % 60).padStart(2, "0");

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[300px_1fr]">
      {/* Player */}
      <div className="flex flex-col items-center">
        {hasAudioFile && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            ref={audioRef}
            src={resolvedAudioUrl ?? undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={playNext}
            onError={() => setAudioError(true)}
          />
        )}

        <div className="relative flex h-64 w-64 items-center justify-center">
          <motion.div
            animate={{ rotate: playing ? 360 : 0 }}
            transition={{ duration: 5, repeat: playing ? Infinity : 0, ease: "linear" }}
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.ink)_0%,theme(colors.ink)_28%,theme(colors.line)_28.5%,theme(colors.ink)_32%,theme(colors.ink)_100%)] shadow-xl dark:bg-[radial-gradient(circle_at_center,white_0%,white_28%,theme(colors.line-dark)_28.5%,theme(colors.void-deep)_32%,theme(colors.void-deep)_100%)]"
          />
          <div className="relative z-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-paper bg-thread dark:border-void">
            {active.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.art} alt={active.title} className="h-full w-full object-cover" />
            ) : (
              <Music2 className="h-6 w-6 text-white" />
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="font-display text-xl">{active.title}</p>
          <p className="mt-1 text-sm text-mist">{active.artist}</p>
          {active.note && <p className="mt-2 max-w-[220px] text-xs italic text-mist">{active.note}</p>}
        </div>

        {hasAudioFile ? (
          <>
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="mt-6 grid h-12 w-12 place-items-center rounded-full bg-ink text-paper transition-transform hover:scale-105 dark:bg-white dark:text-black"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <div className="mt-4 w-full max-w-[220px]">
              <div
                onClick={(e) => seekTo(e.clientX, e.currentTarget)}
                className="h-1 w-full cursor-pointer overflow-hidden rounded-full bg-line dark:bg-line-dark"
              >
                <motion.div
                  className="h-full rounded-full bg-thread"
                  animate={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-mist">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              {audioError && (
                <p className="mt-2 text-center text-[10px] text-red-500">
                  Не удалось загрузить файл — проверьте, что объект в R2 публичный.
                </p>
              )}
            </div>
          </>
        ) : hasEmbed ? (
          <div className="mt-6 w-full">
            {active.spotifyUrl && (
              <iframe
                src={active.spotifyUrl}
                width="100%"
                height="152"
                style={{ borderRadius: 12, border: 0 }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            )}
            {!active.spotifyUrl && active.youtubeUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={active.youtubeUrl}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="mt-6 grid h-12 w-12 place-items-center rounded-full bg-ink text-paper transition-transform hover:scale-105 dark:bg-white dark:text-black"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <div className="mt-4 w-full max-w-[220px]">
              <div className="h-1 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                <motion.div
                  className="h-full rounded-full bg-thread"
                  animate={{ width: `${(progress / TRACK_LENGTH_S) * 100}%` }}
                  transition={{ ease: "linear", duration: 0.3 }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-mist">
                <span>
                  {mm}:{ss}
                </span>
                <span>No link added yet</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Playlist, grouped by artist */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = openArtist === group.artist;
          return (
            <div key={group.artist} className="border-b border-line last:border-0 dark:border-line-dark">
              <button
                onClick={() => toggleGroup(group.artist)}
                className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-thread"
              >
                <span className="flex items-baseline gap-2.5">
                  <span className="font-display text-lg text-ink dark:text-white">{group.artist}</span>
                  <span className="text-xs text-mist">
                    {group.tracks.length} {group.tracks.length === 1 ? "track" : "tracks"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-mist transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {group.tracks.map(({ title, index }) => {
                      const track = playlist[index];
                      return (
                        <li key={title + index}>
                          <button
                            onClick={() => selectTrack(index)}
                            className={`flex w-full items-center gap-4 py-3 pl-1 text-left transition-colors ${
                              activeIndex === index ? "text-thread" : "hover:text-thread"
                            }`}
                          >
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-current transition-colors ${
                                activeIndex === index ? "border-thread" : "border-line dark:border-line-dark"
                              }`}
                            >
                              {activeIndex === index && playing ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 font-display text-base text-ink dark:text-white">
                              {title}
                            </span>
                            {(track.audioUrl || track.spotifyUrl || track.youtubeUrl) && (
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-mist" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
