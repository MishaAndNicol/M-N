"use client";

import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import { site } from "@/lib/site-config";
import { haversineKm } from "@/lib/utils";

// Abstract dotted-globe projection rather than a literal world map - keeps
// the minimal aesthetic and avoids a heavy geo asset. Points are placed by
// simple equirectangular projection of lat/lng onto the viewBox.
function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

// The thread runs from Nicol's city to Misha's city, in that order - the
// "Flight Progress" plane travels start (Prague) → end (Suwon).
const AVG_CRUISE_KMH = 850;
// Purely an animation curve, not a claimed fact: once a real meeting date
// exists, the plane's position eases in from this many days out.
const PLANNING_WINDOW_DAYS = 120;

function formatFlightDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `~${h} hr` : `~${h} hr ${m} min`;
}

export function JourneyMap() {
  const misha = site.people[0];
  const nicol = site.people[1];

  const W = 800, H = 400;
  const start = project(nicol.coords.lat, nicol.coords.lng, W, H); // Prague
  const end = project(misha.coords.lat, misha.coords.lng, W, H); // Suwon
  const distance = haversineKm(nicol.coords, misha.coords);
  const flightHours = distance / AVG_CRUISE_KMH;

  const midX = (start.x + end.x) / 2;
  const arcY = Math.min(start.y, end.y) - 70;
  const path = `M ${start.x} ${start.y} Q ${midX} ${arcY} ${end.x} ${end.y}`;

  const dots = [];
  for (let x = 20; x < W; x += 24) {
    for (let y = 20; y < H; y += 24) {
      dots.push({ x, y });
    }
  }

  const meetingDate = site.meetingDate;
  let progress = 0;
  let caption = "No date yet.";
  if (meetingDate) {
    const daysLeft = Math.ceil((meetingDate.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      progress = 1;
      caption = "Prague and Suwon are the same room.";
    } else {
      progress = Math.min(1, Math.max(0, 1 - daysLeft / PLANNING_WINDOW_DAYS));
      caption = `${daysLeft.toLocaleString()} day${daysLeft === 1 ? "" : "s"} until Prague and Suwon are the same room.`;
    }
  }

  // Position the plane along the quadratic bezier at t = progress (kept
  // small/near start when progress is 0, so it visibly "waits" at Prague).
  const t = Math.max(0.02, progress);
  const bx = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * midX + t * t * end.x;
  const by = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * arcY + t * t * end.y;
  const tPrev = Math.max(0, t - 0.01);
  const bxPrev = (1 - tPrev) * (1 - tPrev) * start.x + 2 * (1 - tPrev) * tPrev * midX + tPrev * tPrev * end.x;
  const byPrev = (1 - tPrev) * (1 - tPrev) * start.y + 2 * (1 - tPrev) * tPrev * midX + tPrev * tPrev * end.y;
  const angle = (Math.atan2(by - byPrev, bx - bxPrev) * 180) / Math.PI;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-white/30 p-6 dark:border-line-dark dark:bg-white/[0.02] md:p-10">
      <p className="eyebrow mb-6">Thread of fate</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={1} className="fill-mist/25" />
        ))}

        <motion.path
          d={path}
          fill="none"
          strokeWidth={1.5}
          className="stroke-[var(--season-accent)]"
          strokeDasharray="1000"
          initial={{ strokeDashoffset: 1000 }}
          whileInView={{ strokeDashoffset: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />

        {[start, end].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} className="fill-thread" />
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={5}
              className="fill-thread/40"
              animate={{ r: [5, 16, 5], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }}
            />
          </g>
        ))}

        <motion.g
          animate={{ x: bx, y: by, rotate: angle }}
          transition={{ type: "spring", stiffness: 40, damping: 14 }}
        >
          <Plane className="h-4 w-4 -translate-x-2 -translate-y-2 fill-ink text-ink dark:fill-paper dark:text-paper" />
        </motion.g>
      </svg>

      <div className="mt-2 flex items-center justify-center">
        <p className={progress > 0 ? "font-display italic text-thread" : "font-mono text-xs uppercase tracking-widest text-mist"}>
          {caption}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-8 dark:border-line-dark sm:grid-cols-4">
        <div>
          <p className="eyebrow">Where she lives</p>
          <p className="mt-1 font-display text-lg">
            {nicol.city}, {nicol.cityCountry}
          </p>
        </div>
        <div>
          <p className="eyebrow">Where he lives</p>
          <p className="mt-1 font-display text-lg">
            {misha.city}, {misha.cityCountry}
          </p>
        </div>
        <div>
          <p className="eyebrow">Distance</p>
          <p className="mt-1 font-display text-lg">{distance.toLocaleString()} km</p>
        </div>
        <div>
          <p className="eyebrow">Flight time</p>
          <p className="mt-1 font-display text-lg">{formatFlightDuration(flightHours)}</p>
        </div>
      </div>
    </div>
  );
}
