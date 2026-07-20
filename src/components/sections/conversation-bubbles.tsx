"use client";

import { motion } from "framer-motion";
import { quotes } from "@/lib/quotes";
import { site } from "@/lib/site-config";

// Real, verified quote cards - not a simulated chat log. Append more real
// quotes to src/lib/quotes.ts (or, later, the admin panel) and they'll show
// up here without any layout changes.
export function ConversationBubbles() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
      {quotes.map((q, i) => {
        const name = q.who === "a" ? site.people[0].name : site.people[1].name;
        return (
          <motion.figure
            key={q.text}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: (i % 4) * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between rounded-[var(--season-radius-sm)] border border-line bg-white/40 p-7 dark:border-line-dark dark:bg-white/[0.02]"
          >
            <blockquote className="font-display text-lg font-light leading-relaxed">
              &ldquo;{q.text}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-thread">{name}</span>
              {q.context && <span className="text-xs italic text-mist">{q.context}</span>}
            </figcaption>
          </motion.figure>
        );
      })}
    </div>
  );
}
