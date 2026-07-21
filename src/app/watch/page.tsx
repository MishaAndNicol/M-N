import { Reveal } from "@/components/ui/reveal";
import { WatchRoom } from "@/components/sections/watch-room";

export const metadata = { title: "Watch together - two story" };

export default function WatchPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 07</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            Same film, two screens
          </h1>
        </Reveal>

        <div className="mt-16">
          <WatchRoom />
        </div>
      </div>
    </div>
  );
}
