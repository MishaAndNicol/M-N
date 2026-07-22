import type { NextConfig } from "next";

// Repo name on GitHub — must match exactly (case-sensitive) for GitHub Pages
// project sites, since the site is served from username.github.io/REPO_NAME.
// Change this in one place if you rename the repo.
const REPO_NAME = "M-N";

// GitHub Actions sets GITHUB_ACTIONS=true automatically during CI builds.
// Locally (npm run dev / a local npm run build) basePath stays empty so
// dev mode keeps working normally.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGithubActions ? `/${REPO_NAME}` : "",
  assetPrefix: isGithubActions ? `/${REPO_NAME}/` : "",
  // next/image does NOT automatically prefix its `src` with basePath the
  // way next/link and next/script do (this is a known Next.js quirk, not
  // a bug in this project) - so components that pass a raw "/images/..."
  // path to <Image> need to prepend it by hand via lib/base-path.ts. This
  // env var mirrors the basePath above so that helper has access to the
  // same value on the client, where plain (non-NEXT_PUBLIC_) env vars
  // aren't available.
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubActions ? `/${REPO_NAME}` : "",
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
