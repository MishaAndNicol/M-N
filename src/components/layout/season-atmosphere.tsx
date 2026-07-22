"use client";

import { useMemo } from "react";

// Ambient, decorative only - a handful of drifting summer "fireflies",
// pure CSS animation (no canvas needed at this density), reduced-motion
// respected via the global media query in globals.css which freezes all
// animation-duration to ~0.
//
// This used to switch look between four seasons; the site now has a
// single permanent design (summer), so this always renders the summer
// particle treatment.

const COUNT = 18;

function useParticles() {
  return useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        left: ((i * 53.7) % 100).toFixed(2),
        top: ((i * 37.3) % 90).toFixed(2),
        delay: (i % 9) * 1.1,
        duration: 10 + (i % 6) * 2.4,
        size: 6 + (i % 4) * 3,
        drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 4),
      })),
    []
  );
}

export function SeasonAtmosphere() {
  const particles = useParticles();

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="season-particle season-particle--summer"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // @ts-expect-error custom property
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
