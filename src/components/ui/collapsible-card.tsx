"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Same open/close chrome as the watch-schedule card (rounded card, chevron
// that rotates, height/opacity animation) - reused here so the film
// picker / sections / bulk-add panels can be tucked away once they've
// been used, instead of always taking up vertical space.
export function CollapsibleCard({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card-surface overflow-hidden p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span className="eyebrow flex items-center gap-2">
            {icon} {title}
          </span>
          {!open && subtitle && <span className="truncate text-xs font-normal text-mist">{subtitle}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-mist transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-6 pb-6 pt-4 dark:border-line-dark">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
