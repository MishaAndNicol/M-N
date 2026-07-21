import { Reveal } from "@/components/ui/reveal";
import { MusicList } from "@/components/sections/music-list";

export const metadata = { title: "Music - two story" };

export default function MusicPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 05</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            Songs that already mean something
          </h1>
        </Reveal>
        <div className="mt-16">
          <MusicList />
        </div>
      </div>
    </div>
  );
}
