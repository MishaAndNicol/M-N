// Cloudflare R2 has no API-key-gated "stream this file" endpoint like Drive
// did - a public R2 bucket (or a public custom domain in front of it) just
// serves objects as plain HTTPS URLs, and those URLs already support Range
// requests out of the box, which is what lets the native <video> element
// seek instead of re-downloading from the start every time.
//
// So there's no "build a signed/streaming URL" step anymore - whatever the
// person pastes in either already *is* the playable URL, or is an object
// key that just needs the bucket's public base URL glued on the front.
//
// Two ways to point the app at a file:
//  1) Paste the full public URL Cloudflare gives the object, e.g.
//     https://pub-xxxxxxxx.r2.dev/episode-01.mp4
//     or, with a custom domain mapped to the bucket:
//     https://videos.example.com/episode-01.mp4
//  2) Configure NEXT_PUBLIC_R2_PUBLIC_BASE_URL once (in .env.local / GitHub
//     Secrets) and from then on just paste the object key, e.g.
//     episode-01.mp4  or  season-1/episode-01.mp4
const RAW_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
const R2_PUBLIC_BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, "") : null;

// Turns whatever the person pasted into a full https:// URL, or returns
// null if it can't be resolved (a bare object key with no base URL
// configured - nothing to glue it onto).
export function resolveVideoUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!R2_PUBLIC_BASE_URL) return null;
  return `${R2_PUBLIC_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
}

export function hasR2BaseUrl(): boolean {
  return Boolean(R2_PUBLIC_BASE_URL);
}
