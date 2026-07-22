// Mirrors the `basePath` computed in next.config.ts (empty locally, "/M-N"
// on the GitHub Pages build). next/link, next/script, and CSS/JS assets
// all get this prefixed automatically by Next.js - but next/image does
// NOT do this for its `src` prop, so any local ("/images/...") path
// passed to <Image> needs to go through this helper by hand, or the
// browser will request it from the domain root and get a 404 on GitHub
// Pages project sites.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}
