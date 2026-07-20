import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site-config";

export function OpeningLine() {
  const days = Math.round((Date.now() - new Date(site.metAt).getTime()) / 86400000);
  return (
    <section className="border-y border-line py-24 dark:border-line-dark md:py-32">
      <div className="container-page">
        <Reveal>
          <p className="max-w-2xl text-balance font-display text-2xl font-light leading-relaxed md:text-3xl">
            {site.people[0].name} is from {site.people[0].country}, currently living in {site.people[0].city},{" "}
            {site.people[0].cityCountry}. {site.people[1].name} is from {site.people[1].country}, currently based in{" "}
            {site.people[1].city}, {site.people[1].cityCountry}. Two time zones, one shared language - English -
            and <span className="italic text-thread">{days.toLocaleString()} days</span> of talking, most of them.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
