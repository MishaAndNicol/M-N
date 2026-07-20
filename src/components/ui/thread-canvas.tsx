"use client";

import { useEffect, useRef } from "react";

// Signature ambient background: faint drifting points connected by thin
// threads when close together - two "home" points pulse slightly brighter,
// echoing the two-people/two-cities motif without being literal about it.
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
    const isDark = document.documentElement.classList.contains("dark");
    const dotColor = isDark ? "255,255,255" : "10,11,13";

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of points) {
        if (!prefersReduced && !p.anchor) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
      }
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const max = 160 * devicePixelRatio;
          if (d < max) {
            const isThread = (i === 0 && j === 1);
            ctx.strokeStyle = isThread
              ? "rgba(76,111,255,0.35)"
              : `rgba(${dotColor},${(1 - d / max) * 0.12})`;
            ctx.lineWidth = isThread ? 1.4 : 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of points) {
        ctx.beginPath();
        ctx.fillStyle = p.anchor ? "rgba(76,111,255,0.9)" : `rgba(${dotColor},0.35)`;
        ctx.arc(p.x, p.y, p.anchor ? 3 : 1.4, 0, Math.PI * 2);
        ctx.fill();
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
