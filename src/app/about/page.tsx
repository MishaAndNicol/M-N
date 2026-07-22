import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site-config";
import { ProfileCard } from "@/components/sections/profile-card";

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
    </div>
  );
}
