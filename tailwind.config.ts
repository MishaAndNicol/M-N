import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Day face - "Девятый вал": deep sea-ink used for text, the
        // colour of a wave trough in shadow, not a neutral UI black.
        ink: "#1B2420",
        // Day face background - foam and dawn-lit storm haze, not a
        // clean paper white. Slightly golden-grey, like spray catching
        // the first light.
        paper: "#EDE6D3",
        mist: "#6E796E",
        // Foam hairline - pale, faintly golden, the line where spray
        // has dried on a rope or a rail.
        line: "#DED2AC",
        // Cool deep-cobalt hairline in dark mode - Van Gogh's swirling
        // ultramarine sky, not a darker shade of the foam line. Kept as
        // an RGB triplet so opacity modifiers (border-line-dark/40, etc.)
        // keep working.
        "line-dark": "rgb(var(--line-dark-rgb) / <alpha-value>)",
        // Dedicated dark-mode canvas - deep ultramarine night, distinct
        // from `ink` (which stays the sea-ink light-mode text colour).
        // Body background switches to this in dark rather than reusing
        // `ink`.
        void: "#0A1330",
        "void-deep": "#050815",
        // Warm dawn-gold in light mode (the light breaking through the
        // storm clouds in the Ninth Wave), chrome-yellow starlight in
        // dark mode (Van Gogh's stars and moon) - same utility classes
        // everywhere (thread, thread/20, border-thread...), the colour
        // itself switches with the theme via the CSS variables below.
        thread: "rgb(var(--accent-rgb) / <alpha-value>)",
        "thread-soft": "rgb(var(--accent-soft-rgb) / <alpha-value>)",
        ember: "#C1502F",
      },
      fontFamily: {
        // Points at a CSS variable that itself switches with the theme
        // (Playfair Display by day, Cormorant by night) - see
        // globals.css. Every font-display usage sitewide changes
        // register with zero per-component edits.
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-work-sans)", "sans-serif"],
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
        // Slow painterly sway - used for the day-mode wave haze and the
        // night-mode sky swirl layers. Different durations per layer
        // give a parallax-drift feel without a literal wave/orbit path.
        "swirl-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "50%": { transform: "translate3d(-1.5%,1%,0) rotate(1.2deg)" },
        },
        "swell-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(1.2%,0.6%,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
        "thread-draw": "thread-draw 2.4s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        "swirl-drift": "swirl-drift 22s ease-in-out infinite",
        "swell-drift": "swell-drift 16s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
