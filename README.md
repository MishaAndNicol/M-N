# two story

A personal site telling the story of two people, two cities, and the thread between them. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Framer Motion, and statically exported for GitHub Pages.

## Stack

- **Next.js 15** (App Router, static export)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** for animation
- **Firebase** (Firestore + Auth) for the guestbook, watch room sync, and admin login
- **Cloudflare R2** for video/audio hosting

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The site runs immediately with no configuration - Firebase-backed features (guestbook, watch room sync, admin) fall back to a local-only demo mode until Firebase is connected.

## Features

- **Home** - animated canvas background, staggered text reveal, chapter index
- **About** - two profile cards, animated timeline
- **Journey** - distance calculator (haversine) with an animated map between the two cities
- **Memories** - filterable gallery grid with a shared-layout modal
- **Conversations** - animated chat-bubble timeline
- **Music** - track list that plays real audio from Cloudflare R2, with Spotify/YouTube embeds as an optional fallback
- **Watch** (`/watch`) - paste a public Cloudflare R2 video URL and play it in a synced `<video>` player; play/pause/seek stay in sync between both people live via Firestore, with a chat panel that opens over the player (including in fullscreen) and a shared playlist
- **Dreams** - future-goals cards
- **Countdown** - flip-digit countdown to a target date
- **Guestbook** - Firestore-backed form with realtime updates, local-only until Firebase is connected
- **Admin** - Firebase Auth login and a dashboard scaffold
- Dark/light mode, mobile nav, reduced-motion support, SEO metadata

## Configuration

Copy `.env.example` to `.env.local` and fill in the values you need.

### Firebase (guestbook, watch room, admin)

1. Create a Firebase project → enable **Authentication** (Email/Password), **Firestore**, and **Storage**.
2. Fill in the `NEXT_PUBLIC_FIREBASE_*` variables from your Firebase project settings.
3. Create one admin user manually in the Firebase console (Authentication tab) - that's the account used to sign in at `/admin/login`. Set `NEXT_PUBLIC_ADMIN_EMAIL` to that address.
4. Add a Firestore rule scoped to the watch room, so the rest of your Firestore data isn't left open by accident:

   ```
   match /watchRoom/{doc} {
     allow read, write: if true;
   }
   ```

   The `/watch` page reads and writes a single document there (`watchRoom/room`) with no auth check, by design - the site has no visitor login. Only a video URL, a title, and playback state (`playing`, `positionSeconds`, `syncBy`, `syncUpdatedAt`) are stored.

The guestbook form and admin login already call the real Firestore/Auth APIs - once the env vars are set, they go live with no code changes. The admin dashboard (`src/app/admin/dashboard/page.tsx`) is a scaffold; each panel is stubbed with a comment pointing at `src/lib/firebase.ts`.

### Cloudflare R2 (video and audio)

The Watch Room and Music page play files straight from a public Cloudflare R2 bucket - no API key required, since access is public at the bucket/object level and `<video>`/`<audio>` just point at the URL directly.

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), create an **R2** bucket.
2. Under the bucket's **Settings → Public access**, enable the **R2.dev subdomain** (or attach a custom domain). This gives you a base URL like `https://pub-xxxxxxxxxxxx.r2.dev`.
3. Upload files under **Objects → Upload** (or via the S3-compatible API with `rclone`/AWS CLI for bulk uploads). Use lowercase, hyphenated filenames (`episode-01.mp4`, not `Episode 1.mp4`).
4. Paste video/audio links into the site in one of two ways:
   - Paste the full public URL directly (`https://pub-xxxx.r2.dev/episode-01.mp4`) - no env var needed.
   - Or set `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` to your bucket's base URL once, then paste just the object key (`episode-01.mp4`) each time.

A public bucket means anyone with the direct file URL can open it, without a password - fine for links that are never shared publicly, but not a substitute for real access control. For copyrighted music specifically, prefer `spotifyUrl`/`youtubeUrl` over uploading your own files if you want to avoid that question entirely.

## Deploying to GitHub Pages

The project is already set up for static export and CI deploys via GitHub Actions (`.github/workflows/deploy.yml`).

1. **Repo name** - `next.config.ts` hardcodes `REPO_NAME` for the GitHub Pages `basePath`. If your repository isn't named `M-N`, update that constant to match (or set it to `""` if the site will live at `username.github.io` directly, i.e. the repo name matches your GitHub username).
2. **Secrets** - under **Settings → Secrets and variables → Actions**, add a repository secret for each variable in `.env.example` (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_ADMIN_EMAIL`, and optionally `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`). These are public client-side Firebase keys - shipping them in the built JS is normal for Firebase; actual security comes from Firestore Security Rules, not from keeping these secret.
3. **Enable Pages** - under **Settings → Pages → Source**, choose **GitHub Actions** (not "Deploy from a branch").
4. Push to `main`. The workflow builds (`npm run build`, static export) and deploys automatically; check the **Actions** tab for progress. The site will be live at `https://<username>.github.io/<repo-name>/`.

## Editing content

Names, bios, the timeline, dreams, and the planned meeting date all live in `src/lib/site-config.ts` - start there. Replace the placeholder images in `public/images/` with real photos (same filenames, or update the paths in `site-config.ts` and `memories-grid.tsx`).

## Project structure

```
src/
  app/            routes (one folder per page)
  components/
    layout/       navbar, footer, theme provider
    sections/     page-specific building blocks
    ui/           small reusable primitives (Reveal, Eyebrow, ThreadCanvas)
  lib/            site-config (content), firebase, r2, utils
```
