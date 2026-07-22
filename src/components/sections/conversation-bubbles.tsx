"use client";

import { motion } from "framer-motion";
import { quotes } from "@/lib/quotes";
import { site } from "@/lib/site-config";

// Real, verified quote cards - not a simulated chat log. Append more real
// quotes to src/lib/quotes.ts (or, later, the admin panel) and they'll show
// up here without any layout changes.
//
// Split into two dedicated columns, one per person, rather than one mixed
// grid - each side keeps its own quotes in order, so it reads like "what
// Misha said" next to "what Nicol said" instead of a shuffled feed.
function QuoteColumn({ who, name }: { who: "a" | "b"; name: string }) {
  const mine = quotes.filter((q) => q.who === who);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-thread" aria-hidden />
        <h2 className="font-display text-xl italic">{name}</h2>
      </div>
      <div className="flex flex-col gap-5">
        {mine.map((q, i) => (
          <motion.figure
            key={q.text}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: (i % 4) * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="card-surface flex flex-col justify-between p-7"
          >
            <blockquote className="font-display text-lg font-light leading-relaxed">
              &ldquo;{q.text}&rdquo;
            </blockquote>
            {q.context && (
              <figcaption className="mt-6">
                <span className="text-xs italic text-mist">{q.context}</span>
              </figcaption>
            )}
          </motion.figure>
        ))}
        {mine.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mist dark:border-line-dark">
            No lines from {name} yet.
          </p>
        )}
      </div>
    </div>
  );
}

export function ConversationBubbles() {
  const [misha, nicol] = site.people;

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
      <QuoteColumn who="a" name={misha.name} />
      <QuoteColumn who="b" name={nicol.name} />
    </div>
  );
}
