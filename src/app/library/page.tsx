import { Reveal } from "@/components/ui/reveal";
import { LibraryShelves } from "@/components/sections/library-shelves";

export const metadata = { title: "Shared library - two story" };

export default function LibraryPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 04</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            A shelf for what we share
          </h1>
        </Reveal>

        <div className="mt-16">
          <LibraryShelves />
        </div>
      </div>
    </div>
  );
}
