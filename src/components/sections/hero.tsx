"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { ThreadCanvas } from "@/components/ui/thread-canvas";
import { site } from "@/lib/site-config";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      <ThreadCanvas />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper dark:to-ink" />

      <div className="container-page relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="eyebrow mb-6"
        >
          {site.people[0].city} - {site.people[1].city}
        </motion.p>

        <h1 className="max-w-3xl text-balance font-display text-5xl font-light leading-[1.05] tracking-tight md:text-7xl">
          {site.hero.title.split(" ").map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="mr-[0.28em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-10"
        >
          <Link
            href="/about"
            className="group inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3 text-sm text-paper transition-transform hover:scale-[1.03] dark:bg-paper dark:text-ink"
          >
            Begin the story
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-mist"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ArrowDown className="h-3.5 w-3.5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
