import { Reveal } from "@/components/ui/reveal";
import { LibraryShelves } from "@/components/sections/library-shelves";

export const metadata = { title: "Shared library - two story" };

export default function LibraryPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 06</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            A shelf for what we share
          </h1>
          <p className="mt-5 max-w-lg text-mist">
            Books, movies, games, and places worth visiting one day - added as they become real, not guessed at.
          </p>
        </Reveal>

        <div className="mt-16">
          <LibraryShelves />
        </div>
      </div>
    </div>
  );
}
