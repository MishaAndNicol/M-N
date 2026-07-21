"use client";

import { motion } from "framer-motion";
import { Check, Hourglass } from "lucide-react";
import { site } from "@/lib/site-config";

// Capped at 4–6 items per the brief. `achieved` is read straight from
// site-config so an item can flip to done later without touching this
// component at all.
export function NotYetGrid() {
  const items = site.notYet.slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
          className="card-surface group relative overflow-hidden border-dashed p-7 transition-colors hover:border-thread/40"
        >
          <div
            className={`mb-6 flex h-10 w-10 items-center justify-center rounded-full ${
              item.achieved ? "bg-thread text-white" : "bg-thread/10 text-thread"
            }`}
          >
            {item.achieved ? <Check className="h-4 w-4" /> : <Hourglass className="h-4 w-4" />}
          </div>
          <h3 className="font-display text-xl">{item.title}</h3>
          <span className={`eyebrow mt-6 inline-block ${item.achieved ? "text-thread" : "text-thread/70"}`}>
            {item.achieved ? "It happened" : "Not yet."}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
