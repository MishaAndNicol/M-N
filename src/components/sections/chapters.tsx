import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

const CHAPTERS = [
  { n: "01", href: "/about", title: "About us", text: "Who we are, apart from each other." },
  { n: "02", href: "/memories", title: "Memories", text: "Empty tiles, waiting for real ones." },
  { n: "03", href: "/music", title: "Music", text: "Songs that already mean something." },
  { n: "04", href: "/watch", title: "Watch together", text: "Same film, two screens." },
  { n: "05", href: "/not-yet", title: "Not yet", text: "What hasn't happened. Not sad - just not yet." },
];

export function Chapters() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-3">The story, in chapters</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line dark:border-line-dark md:grid-cols-2">
          {CHAPTERS.map((c, i) => (
            <Reveal key={c.href} delay={i * 0.05}>
              <Link
                href={c.href}
                className="group flex h-full flex-col justify-between gap-8 bg-paper p-8 transition-colors hover:bg-ink/[0.02] dark:bg-void dark:hover:bg-white/[0.03] md:p-10"
              >
                <span className="font-mono text-xs text-mist">{c.n}</span>
                <div>
                  <h3 className="font-display text-2xl">{c.title}</h3>
                  <p className="mt-2 text-sm text-mist">{c.text}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-thread opacity-0 transition-opacity group-hover:opacity-100">
                  Read this chapter →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
