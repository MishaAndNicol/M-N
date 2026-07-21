import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12100D",
        paper: "#F6F1E6",
        mist: "#8A8578",
        line: "#E5DDCC",
        "line-dark": "#241F1A",
        // Warm-ink rust in light mode (handwritten pen color), warm ember
        // glow in dark mode (cinematic accent) - same utility classes
        // everywhere (thread, thread/20, border-thread...), the color
        // itself switches with the theme via the CSS variables below.
        thread: "rgb(var(--accent-rgb) / <alpha-value>)",
        "thread-soft": "rgb(var(--accent-soft-rgb) / <alpha-value>)",
        ember: "#D96B4C",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-work-sans)", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grain": "url('/images/grain.svg')",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "thread-draw": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
        "thread-draw": "thread-draw 2.4s ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
