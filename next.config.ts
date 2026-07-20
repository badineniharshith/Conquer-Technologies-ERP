import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Performance: Enable modern image formats for automatic WebP/AVIF delivery
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60
  },
  // Performance: Enable gzip/brotli compression
  compress: true,
  // Misc
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;


