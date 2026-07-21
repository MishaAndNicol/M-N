"use client";

import { motion } from "framer-motion";
import { BookOpen, Clapperboard, Gamepad2, Compass } from "lucide-react";
import { site } from "@/lib/site-config";

type Item = { title: string; note?: string };

const SHELVES: { key: keyof typeof site.library; label: string; icon: typeof BookOpen; empty: string }[] = [
  { key: "books", label: "Books", icon: BookOpen, empty: "No books added yet - this shelf is waiting for real titles." },
  { key: "movies", label: "Movies", icon: Clapperboard, empty: "Nothing watched together yet, on the record." },
  { key: "games", label: "Games", icon: Gamepad2, empty: "No games added yet." },
  { key: "places", label: "Places we'd like to visit", icon: Compass, empty: "No places picked yet - an empty map, for now." },
];

function Shelf({
  label,
  icon: Icon,
  items,
  empty,
  delay,
}: {
  label: string;
  icon: typeof BookOpen;
  items: Item[];
  empty: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      className="rounded-[var(--season-radius)] border border-line bg-white/40 p-7 dark:border-line-dark dark:bg-white/[0.02]"
    >
      <div className="flex items-center gap-2.5 text-thread">
        <Icon className="h-4 w-4" />
        <h3 className="font-display text-xl text-ink dark:text-paper">{label}</h3>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-mist dark:border-line-dark">
          {empty}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.title} className="border-b border-line pb-3 last:border-0 dark:border-line-dark">
              <p className="font-display text-base">{item.title}</p>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export function LibraryShelves() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {SHELVES.map((s, i) => (
        <Shelf
          key={s.key}
          label={s.label}
          icon={s.icon}
          items={site.library[s.key]}
          empty={s.empty}
          delay={i * 0.08}
        />
      ))}
    </div>
  );
}
