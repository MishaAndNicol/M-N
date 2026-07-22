import { Reveal } from "@/components/ui/reveal";
import { NotYetGrid } from "@/components/sections/not-yet-grid";

export const metadata = { title: "Not yet - two story" };

export default function NotYetPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 05</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            Not yet. Not sad - just not yet.
          </h1>
          <p className="mt-5 max-w-lg text-mist">
            A short, honest list of what hasn&apos;t happened. Every one of these can move to &ldquo;it
            happened&rdquo; without warning.
          </p>
        </Reveal>

        <div className="mt-16">
          <NotYetGrid />
        </div>
      </div>
    </div>
  );
}
