"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Music2, ExternalLink } from "lucide-react";
import { site } from "@/lib/site-config";

const TRACK_LENGTH_S = 180; // Only used to animate the mock progress bar when no embed is linked yet.

export function MusicList() {
  const playlist = site.playlist;
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = playlist[activeIndex];
  const hasEmbed = Boolean(active?.spotifyUrl || active?.youtubeUrl);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [activeIndex]);

  useEffect(() => {
    if (!playing || hasEmbed) return;
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
  }, [playing, hasEmbed]);

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
        <div className="relative flex h-64 w-64 items-center justify-center">
          <motion.div
            animate={{ rotate: playing ? 360 : 0 }}
            transition={{ duration: 5, repeat: playing ? Infinity : 0, ease: "linear" }}
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.ink)_0%,theme(colors.ink)_28%,theme(colors.line)_28.5%,theme(colors.ink)_32%,theme(colors.ink)_100%)] shadow-xl dark:bg-[radial-gradient(circle_at_center,theme(colors.paper)_0%,theme(colors.paper)_28%,theme(colors.line-dark)_28.5%,#050608_32%,#050608_100%)]"
          />
          <div className="relative z-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-paper bg-thread dark:border-ink">
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

        {hasEmbed ? (
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
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="mt-6 grid h-12 w-12 place-items-center rounded-full bg-ink text-paper transition-transform hover:scale-105 dark:bg-paper dark:text-ink"
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

      {/* Playlist */}
      <ul className="divide-y divide-line dark:divide-line-dark">
        {playlist.map((s, i) => (
          <motion.li
            key={s.title + i}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <button
              onClick={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-4 py-4 text-left transition-colors ${
                activeIndex === i ? "text-thread" : "hover:text-thread"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-current transition-colors ${
                  activeIndex === i ? "border-thread" : "border-line dark:border-line-dark"
                }`}
              >
                {activeIndex === i && playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-ink dark:text-paper">{s.title}</p>
                <p className="text-sm text-mist">
                  {s.artist}
                  {s.note ? ` - ${s.note}` : ""}
                </p>
              </div>
              {(s.spotifyUrl || s.youtubeUrl) && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-mist" />}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
