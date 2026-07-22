"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Languages, GraduationCap } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

type Person = {
  name: string;
  country: string;
  city: string;
  cityCountry: string;
  university?: string;
  major?: string;
  note?: string;
  languages: string[];
  hobbies: string[];
  bio: string;
  photo: string;
};

export function ProfileCard({ person, delay = 0 }: { person: Person; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface group overflow-hidden"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-line dark:bg-line-dark">
        <Image
          src={withBasePath(person.photo)}
          alt={person.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-6 text-white">
          <h3 className="font-display text-3xl">{person.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
            <MapPin className="h-3.5 w-3.5" /> {person.city}, {person.cityCountry}
          </p>
        </div>
      </div>

      <div className="p-7">
        <p className="text-xs text-mist">
          From {person.country}
          {person.note ? ` · ${person.note}` : ""}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-mist">{person.bio}</p>

        {(person.university || person.major) && (
          <div className="mt-5 flex items-start gap-2 text-sm">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-thread" />
            <span>
              {person.major}
              {person.university ? ` - ${person.university}` : ""}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 text-sm">
          <Languages className="mt-0.5 h-4 w-4 shrink-0 text-thread" />
          <span>{person.languages.join(" · ")}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {person.hobbies.map((h) => (
            <span
              key={h}
              className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mist dark:border-line-dark"
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
