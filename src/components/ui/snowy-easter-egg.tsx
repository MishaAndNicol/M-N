"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// A small detail for Nicol's cat, Snowy - a paw print sitting in the
// corner of the video itself. Clicking it reveals one line, then it's gone
// again. No animation loops, no sound, nothing that competes with the
// actual film playing - lives in the top-left of the stage so it doesn't
// collide with the fullscreen/chat toggles in the top-right.
const LINES = [
  "Snowy approves this episode. Probably.",
  "Snowy was here first, honestly.",
  "Somewhere in Slovakia, a cat is unimpressed by all of this.",
  "Snowy has seen better plot twists. In the food bowl.",
];

export function SnowyEasterEgg() {
  const [open, setOpen] = useState(false);
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Snowy"
        className="glass pointer-events-auto grid h-11 w-11 place-items-center rounded-full text-thread shadow-sm transition-transform hover:scale-110"
      >
        <PawIcon />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="glass pointer-events-auto absolute left-0 top-14 w-56 rounded-[var(--season-radius-sm)] border border-line px-3 py-2 text-xs italic text-mist shadow-lg dark:border-line-dark"
          >
            {line}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
      <circle cx="7" cy="8" r="2.1" />
      <circle cx="12" cy="6" r="2.1" />
      <circle cx="17" cy="8" r="2.1" />
      <path d="M12 12.2c-3.4 0-6.2 2.3-6.2 5.1 0 1.6 1.4 2.6 3 2.1 1-.3 2-.9 3.2-.9s2.2.6 3.2.9c1.6.5 3-.5 3-2.1 0-2.8-2.8-5.1-6.2-5.1Z" />
    </svg>
  );
}
