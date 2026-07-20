import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--season-divider)]">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
        <div>
          <p className="font-display italic">two story</p>
          <p className="mt-1 text-sm text-mist">Two cities. One thread.</p>
        </div>
        <div className="flex items-center gap-4 text-mist">
          <Link href="https://github.com" aria-label="GitHub" className="transition-colors hover:text-thread">
            <Github className="h-4 w-4" />
          </Link>
          <Link href="/admin/login" className="font-mono text-xs uppercase tracking-widest hover:text-thread">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
