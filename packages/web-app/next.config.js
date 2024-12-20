/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "react-native-web",
    "react-native-vector-icons",
    "react-native-paper",
    "@react-native-community",
    "react-native",
    "@sophistree/ui-common",
    "@sophistree/common",
  ],
  webpack: (config) => {
    // Alias react-native to react-native-web
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };

    // Prioritize .web.js files
    config.resolve.extensions = [
      ".web.js",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];

    return config;
  },
  experimental: {
    esmExternals: "loose",
  },
  async headers() {
    return [
      {
        // Allow CORS from extension
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Accept, Accept-Version, Authorization, Content-Length, Content-MD5, Content-Type, Date, X-Auth-Provider",
          },
        ],
      },
    ];
  },
  typescript: {
    // Next isn't picking up .d.ts files from referenced projects
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
