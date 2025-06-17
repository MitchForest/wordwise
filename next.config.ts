import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        perf_hooks: false,
      };
      
      // Mark postgres as external for client-side
      config.externals = config.externals || [];
      config.externals.push('postgres');
    }
    return config;
  },
  serverExternalPackages: ['postgres'],
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    // Your existing experimental flags here...
  },
};

export default nextConfig;
