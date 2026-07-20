# two story

A personal site telling the story of two people, two cities, and the thread between them. Next.js 15 (App Router), TypeScript, Tailwind, Framer Motion.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Works immediately - no Firebase required.

## What's fully built

- **Home** - cinematic hero with animated canvas background (the "thread" motif), staggered text reveal, chapter index
- **About** - two profile cards, animated timeline
- **Journey** - distance calculator (haversine) + animated stylized map with a flight path between the two cities
- **Memories** - filterable gallery grid with a shared-layout modal
- **Conversations** - animated chat-bubble timeline
- **Music** - vinyl animation + track list (swap in real Spotify/YouTube embeds when ready)
- **Watch** (`/watch`) - paste a Google Drive share link, embed it via Drive's own preview player, do a synced ready-check, and get a countdown so you both press play on the same second. Firestore-backed (`watchRoom/room`), local-only demo mode until Firebase is connected. See "Watch room setup" below for the one Firestore rule it needs.
- **Dreams** - future-goals cards, deliberately framed as not-yet-happened
- **Countdown** - flip-digit countdown to a target date, confetti on completion
- **Guestbook** - Firestore-backed form with realtime updates; runs in a local-only fallback mode until Firebase is connected, so it's demoable right away
- **Contact** - simple link cards
- **Admin** - login page wired to Firebase Auth, and a dashboard scaffold (see below)
- Dark/light mode, mobile nav, cursor glow, reduced-motion support, SEO metadata

## What's scaffolded, not wired live

A real backend needs your own credentials - I didn't fabricate a Firebase project. To activate it:

1. Create a Firebase project → enable **Authentication** (Email/Password), **Firestore**, and **Storage**
2. Copy `.env.example` to `.env.local` and fill in your config values
3. Create one admin user manually in the Firebase console (Authentication tab) - that's your `/admin/login`
4. The guestbook (`src/components/sections/guestbook-form.tsx`) and admin login already call the real Firestore/Auth APIs - once env vars are set, they go live with no code changes
5. The admin **dashboard** (`src/app/admin/dashboard/page.tsx`) is a scaffold - each panel is stubbed with a comment pointing at `src/lib/firebase.ts`. Wiring up photo upload / timeline editing / text editing is real engineering work (forms + Firestore writes per collection); the plumbing (`getDb`, `getStorageInstance`, `getAuthInstance`) is ready for it.
6. **i18n** (English/Russian/Czech/Korean) wasn't included - the cleanest path is `next-intl`, routing under `/[locale]/...`. Given the size of the rest of this build, that's a separate follow-up rather than something to bolt on last.
7. **Seasonal cursor modes** (snow / rain / cherry blossom) and **sound effects** weren't included - same reasoning. `cursor-glow.tsx` is the pattern to extend (a canvas/particle layer keyed off a mode toggle).

## Watch room setup

The `/watch` page reads and writes one Firestore document, `watchRoom/room`, with no
auth check (it's a two-person site - nobody signs in to use it). Once your Firebase
project is connected, add a rule scoped to just that path so the rest of your
Firestore data isn't left open by accident:

```
match /watchRoom/{doc} {
  allow read, write: if true;
}
```

The film itself isn't uploaded through the site - each of you shares the actual
video file from your own Google Drive (set to "Anyone with the link can view") and
pastes that link in. Nothing gets copied to Firebase; only the link, a title, and
the ready/countdown state are stored.

Drive's embedded player doesn't expose a way to control it from outside, so this
can't auto-sync play/pause/seeking mid-film like a true watch-party tool would -
the ready-check + countdown gets you both pressing play at the same moment, and an
"I paused" button nudges the other person to pause too.

## Editing content

Everything text-based - names, bios, timeline, dreams, the planned meeting date - lives in one file: `src/lib/site-config.ts`. Start there.

Replace the placeholder images in `public/images/` with real photos (same filenames, or update the paths in `site-config.ts` and `memories-grid.tsx`).

## Structure

```
src/
  app/            routes (one folder per page)
  components/
    layout/       navbar, footer, theme provider, cursor glow
    sections/     page-specific building blocks
    ui/           small reusable primitives (Reveal, Eyebrow, ThreadCanvas)
  hooks/          use-countdown
  lib/            site-config (content), firebase, utils
```
