import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Configure pdf-parse for server-side usage
    if (isServer) {
      // Exclude pdf-parse test files from bundling
      config.externals = config.externals || [];
      config.externals.push({
        'pdf-parse/test': 'commonjs pdf-parse/test',
        './test/data/05-versions-space.pdf': 'commonjs ./test/data/05-versions-space.pdf'
      });
      
      // Add webpack ignore plugin for test files
      const { IgnorePlugin } = require('webpack');
      config.plugins.push(
        new IgnorePlugin({
          resourceRegExp: /^\.\/test\//,
          contextRegExp: /pdf-parse/,
        })
      );
    }

    // Copy PDF.js worker to public directory
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "pdfjs-dist/build/pdf.worker.entry": "pdfjs-dist/build/pdf.worker.min.mjs",
      };
    }

    return config;
  },
  // Allow PDF.js worker to be served
  async headers() {
    return [
      {
        source: "/pdf.worker.min.mjs",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
