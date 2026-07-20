import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site-config";
import { ProfileCard } from "@/components/sections/profile-card";
import { Timeline } from "@/components/sections/timeline";

export const metadata = { title: "About us - two story" };

export default function AboutPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Chapter 01</p>
          <h1 className="max-w-xl font-display text-4xl font-light md:text-5xl">
            Two people, still becoming friends
          </h1>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {site.people.map((p, i) => (
            <ProfileCard key={p.name} person={p} delay={i * 0.1} />
          ))}
        </div>
      </div>

      <div className="container-page mt-32">
        <Reveal>
          <p className="eyebrow mb-4">How it started</p>
          <h2 className="font-display text-3xl font-light md:text-4xl">Where the thread began</h2>
        </Reveal>
        <div className="mt-14">
          <Timeline items={site.timeline} />
        </div>
      </div>
    </div>
  );
}
