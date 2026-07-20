"use client";

import { useEffect, useRef } from "react";

// Ambient cursor glow. Desktop only, pointer-fine, respects reduced motion.
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReduced || !isFinePointer) return;

    let x = 0, y = 0, rafId: number;
    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };
    const render = () => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`;
      }
      rafId = requestAnimationFrame(render);
    };
    window.addEventListener("mousemove", move);
    rafId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 hidden h-[400px] w-[400px] rounded-full bg-thread/[0.08] blur-[100px] md:block"
    />
  );
}
