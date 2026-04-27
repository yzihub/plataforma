import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      // Root → cockpit (proxy handles auth; unauthenticated lands on /signin via proxy)
      { source: "/", destination: "/cockpit", permanent: false },
      // Legacy TailAdmin demo pages — redirect away to avoid confusing YZI users
      { source: "/basic-tables",  destination: "/cockpit", permanent: false },
      { source: "/form-elements", destination: "/cockpit", permanent: false },
      { source: "/bar-chart",     destination: "/cockpit", permanent: false },
      { source: "/line-chart",    destination: "/cockpit", permanent: false },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  
};

export default nextConfig;
