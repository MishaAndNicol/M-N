"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/memories", label: "Memories" },
  { href: "/music", label: "Music" },
  { href: "/library", label: "Library" },
  { href: "/watch", label: "Watch" },
  { href: "/not-yet", label: "Not Yet" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="container-page">
        <div className="mt-4 flex items-center justify-between rounded-full glass px-4 py-2.5 shadow-sm shadow-black/[0.03]">
          <Link href="/" className="font-display text-[15px] italic tracking-tight">
            two&nbsp;story
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-sm text-mist transition-colors hover:text-ink dark:hover:text-white",
                  pathname === link.href && "bg-ink/[0.04] text-ink dark:bg-white/[0.06] dark:text-white"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute inset-x-2 -bottom-0.5 hidden h-px bg-thread dark:block" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="grid h-8 w-8 place-items-center rounded-full text-mist transition-colors hover:bg-ink/[0.05] hover:text-ink dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="block h-4 w-4 dark:hidden" />
            </button>
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full text-mist hover:bg-ink/[0.05] hover:text-ink lg:hidden dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-paper dark:bg-void lg:hidden"
          >
            <div className="container-page flex items-center justify-between py-6">
              <span className="font-display text-[15px] italic">two story</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="container-page flex flex-col gap-2 pt-6">
              {LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line py-4 font-display text-3xl dark:border-line-dark"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
