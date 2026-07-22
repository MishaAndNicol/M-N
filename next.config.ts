import type { NextConfig } from "next";

// Repo name on GitHub — must match exactly (case-sensitive) for GitHub Pages
// project sites, since the site is served from username.github.io/REPO_NAME.
// Change this in one place if you rename the repo.
const REPO_NAME = "M-N";

// GitHub Actions sets GITHUB_ACTIONS=true automatically during CI builds.
// Locally (npm run dev / a local npm run build) basePath stays empty so
// dev mode keeps working normally.


const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: `/${REPO_NAME}`,
  assetPrefix: `/${REPO_NAME}/`,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
