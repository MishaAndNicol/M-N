"use client";

import { useEffect, useRef } from "react";

// Signature ambient background: faint drifting points connected when
// close together - two "home" points pulse slightly brighter, echoing
// the two-people/two-cities motif without being literal about it. The
// two themes render this completely differently: dark mode bows every
// connection into a swirling brushstroke arc (Van Gogh's turbulent sky),
// light mode bows them the other way into a shallow wave-crest curve
// (Aivazovsky's heaving sea), each with its own palette and line logic
// rather than a shared "straight line, different color" treatment.
export function ThreadCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * devicePixelRatio);

    type Point = { x: number; y: number; vx: number; vy: number; anchor?: boolean };
    const count = window.innerWidth < 768 ? 26 : 46;
    const points: Point[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      anchor: i === 0 || i === 1,
    }));
    points[0].x = width * 0.22;
    points[0].y = height * 0.4;
    points[1].x = width * 0.78;
    points[1].y = height * 0.6;

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth * devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    window.addEventListener("resize", onResize);

    let raf: number;
    let frame = 0;
    const isDark = document.documentElement.classList.contains("dark");
    // Pale starlight (dark) / sea-foam (light) - the non-accent dots and
    // connecting threads.
    const dotColor = isDark ? "244,238,214" : "233,242,232";
    // Chrome-star yellow (dark) / dawn-gold (light) - kept in sync with
    // --accent-rgb in globals.css.
    const accentColor = isDark ? "244,203,88" : "199,138,54";
    // Per-point twinkle phase (dark) / swell phase (light).
    const twinkle = points.map(() => Math.random() * Math.PI * 2);
    // Per-pair bow direction, so the swirl/wave arcs don't all curve the
    // same way - a field of brushstrokes, not one repeated stamp.
    const bowSeed = points.map(() => (Math.random() < 0.5 ? -1 : 1));

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);
      for (const p of points) {
        if (!prefersReduced && !p.anchor) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
      }

      if (isDark) {
        // Starry Night: every connection bows into a curved brushstroke,
        // not a straight constellation line - the near pairs swirl like
        // the turbulent sky, one steady chrome-gold stroke arcs between
        // the two "home" stars.
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const a = points[i], b = points[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            const max = 150 * devicePixelRatio;
            if (d < max) {
              const isThread = i === 0 && j === 1;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              const nx = -(b.y - a.y), ny = b.x - a.x;
              const nlen = Math.hypot(nx, ny) || 1;
              const bow = (isThread ? 0.16 : 0.32) * d * bowSeed[i];
              const cx = mx + (nx / nlen) * bow;
              const cy = my + (ny / nlen) * bow;
              ctx.strokeStyle = isThread
                ? `rgba(${accentColor},0.55)`
                : `rgba(${dotColor},${(1 - d / max) * 0.09})`;
              ctx.lineWidth = isThread ? 1.1 : 0.5;
              if (isThread) {
                ctx.shadowColor = `rgba(${accentColor},0.8)`;
                ctx.shadowBlur = 6;
              } else {
                ctx.shadowBlur = 0;
              }
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.quadraticCurveTo(cx, cy, b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.shadowBlur = 0;
        points.forEach((p, i) => {
          const tw = 0.5 + 0.5 * Math.sin(frame * 0.02 + twinkle[i]);
          const alpha = p.anchor ? 0.95 : 0.25 + tw * 0.45;
          ctx.beginPath();
          ctx.fillStyle = p.anchor ? `rgba(${accentColor},${alpha})` : `rgba(${dotColor},${alpha})`;
          if (p.anchor) {
            ctx.shadowColor = `rgba(${accentColor},0.9)`;
            ctx.shadowBlur = 8;
          }
          ctx.arc(p.x, p.y, p.anchor ? 2.6 : 1 + tw * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      } else {
        // Ninth Wave: every connection bows the other way into a
        // shallow, shared-direction curve - a field of low swell rather
        // than swirl, foam-tipped where two points meet.
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const a = points[i], b = points[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            const max = 170 * devicePixelRatio;
            if (d < max) {
              const isThread = i === 0 && j === 1;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2 - (isThread ? 0.1 : 0.16) * d;
              ctx.strokeStyle = isThread
                ? `rgba(${accentColor},0.42)`
                : `rgba(${dotColor},${(1 - d / max) * 0.16})`;
              ctx.lineWidth = isThread ? 1.3 : 0.6;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.quadraticCurveTo(mx, my, b.x, b.y);
              ctx.stroke();
            }
          }
        }
        points.forEach((p, i) => {
          const sw = 0.5 + 0.5 * Math.sin(frame * 0.015 + twinkle[i]);
          ctx.beginPath();
          ctx.fillStyle = p.anchor
            ? `rgba(${accentColor},0.9)`
            : `rgba(${dotColor},${0.3 + sw * 0.25})`;
          ctx.arc(p.x, p.y, p.anchor ? 3 : 1.2 + sw * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (!prefersReduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" aria-hidden />;
}
