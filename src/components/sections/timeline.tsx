"use client";

import { motion } from "framer-motion";

// Milestone-level only - deliberately not date-stamped. See project brief
// Section 8: this is the one timeline on the site, and it stays relative
// ("not long after") rather than a day-by-day log.
type Item = { label: string; title: string; text: string };

export function Timeline({ items }: { items: Item[] }) {
  return (
    <div className="relative border-l border-line pl-8 dark:border-line-dark">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: i * 0.08 }}
          className="relative pb-14 last:pb-0"
        >
          <span className="absolute -left-[41px] top-1 h-3 w-3 rounded-full border-2 border-thread bg-paper dark:bg-void" />
          <p className="font-mono text-xs uppercase tracking-widest text-mist">{item.label}</p>
          <h3 className="mt-1.5 font-display text-xl">{item.title}</h3>
          <p className="mt-1.5 max-w-md text-sm text-mist">{item.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
