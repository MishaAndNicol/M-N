"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Same open/close accordion shape as the "When are we watching?" scheduler
// card, pulled out into its own component so the film picker, sections,
// and bulk-add panels can collapse the same way instead of always taking
// up their full height on the page.
export function CollapsiblePanel({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card-surface overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          {icon}
          <span className="font-medium">{title}</span>
          {subtitle && <span className="truncate text-mist">{subtitle}</span>}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-mist" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-mist" />
        )}
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
            <div className={cn("border-t border-line px-6 pb-6 pt-4 dark:border-line-dark")}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
