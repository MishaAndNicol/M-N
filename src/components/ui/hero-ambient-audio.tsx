"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { site } from "@/lib/site-config";
import { resolveR2Url } from "@/lib/r2";

// Ambient audio for the homepage hero only. Browsers block autoplay with
// sound, so this never tries to play itself - it renders a small toggle,
// the person presses it once, and from then on this component owns
// play/pause for as long as they stay on "/". The moment this component
// unmounts (i.e. they've navigated to any other route, since it only
// ever lives inside the homepage tree) the underlying <audio> element is
// torn down with it, which stops the sound - no separate "did the route
// change" listener needed for that part.
export function HeroAmbientAudio() {
  const url = site.heroAudioUrl ? resolveR2Url(site.heroAudioUrl) : null;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  if (!url) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 1 }}
      aria-label={playing ? "Mute ambient music" : "Play ambient music"}
      className="glass absolute bottom-8 right-6 z-10 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-mist transition-colors hover:text-thread dark:border-line-dark md:bottom-10 md:right-10"
    >
      <audio ref={audioRef} src={url} loop preload="none" />
      {playing ? <VolumeX className="h-3.5 w-3.5" /> : <Music2 className="h-3.5 w-3.5" />}
      {playing ? "Mute" : "Play theme"}
    </motion.button>
  );
}
