import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Logo uploads and backup restores go through server actions.
    // Vercel caps request bodies at 4.5 MB, so stay just under it.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
