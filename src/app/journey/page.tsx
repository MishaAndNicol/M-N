import { Reveal } from "@/components/ui/reveal";
import { JourneyMap } from "@/components/sections/journey-map";

export const metadata = { title: "Journey - two story" };

export default function JourneyPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 02</p>
          <h1 className="max-w-xl text-balance font-display text-4xl font-light md:text-5xl">
            The distance, mapped honestly
          </h1>
        </Reveal>

        <div className="mt-16">
          <JourneyMap />
        </div>
      </div>
    </div>
  );
}
