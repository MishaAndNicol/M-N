"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CameraOff, X } from "lucide-react";

type Memory = { id: string; caption: string; category: string };

// No photos exist yet - nothing has happened in person. These are honest
// empty-state tiles, not stand-ins for invented memories. Swap a tile for a
// real photo (through the admin panel, later) once one exists.
const MEMORIES: Memory[] = [
  { id: "1", caption: "This memory hasn't happened yet.", category: "Places" },
  { id: "2", caption: "A future photograph belongs here.", category: "Firsts" },
  { id: "3", caption: "This memory hasn't happened yet.", category: "Places" },
  { id: "4", caption: "A future photograph belongs here.", category: "Firsts" },
  { id: "5", caption: "This memory hasn't happened yet.", category: "Made for us" },
  { id: "6", caption: "A future photograph belongs here.", category: "Places" },
];

const CATEGORIES = ["All", "Places", "Firsts", "Made for us"];

export function MemoriesGrid() {
  const [filter, setFilter] = useState("All");
  const [active, setActive] = useState<Memory | null>(null);
  const filtered = filter === "All" ? MEMORIES : MEMORIES.filter((m) => m.category === filter);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              filter === c
                ? "bg-ink text-paper dark:bg-paper dark:text-ink"
                : "border border-line text-mist hover:text-ink dark:border-line-dark dark:hover:text-paper"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {filtered.map((m, i) => (
          <motion.button
            key={m.id}
            layoutId={`memory-${m.id}`}
            onClick={() => setActive(m)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: (i % 6) * 0.05 }}
            className="group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-line bg-white/30 p-4 text-center transition-colors hover:border-thread/40 dark:border-line-dark dark:bg-white/[0.02]"
          >
            <CameraOff className="h-5 w-5 text-mist/60 transition-colors group-hover:text-thread" />
            <p className="text-xs text-mist">{m.caption}</p>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              layoutId={`memory-${active.id}`}
              onClick={(e) => e.stopPropagation()}
              className="relative flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-2xl bg-ink p-12 text-center"
            >
              <CameraOff className="h-8 w-8 text-white/50" />
              <p className="text-paper">{active.caption}</p>
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
