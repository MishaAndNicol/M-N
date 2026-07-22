import { Reveal } from "@/components/ui/reveal";
import { MemoriesGrid } from "@/components/sections/memories-grid";

export const metadata = { title: "Memories - two story" };

export default function MemoriesPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 02</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            The moments worth keeping
          </h1>
        </Reveal>
        <div className="mt-16">
          <MemoriesGrid />
        </div>
      </div>
    </div>
  );
}
