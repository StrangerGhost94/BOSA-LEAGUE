/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
  // Server-only packages loaded at runtime instead of bundled (instrumentation is always on in Next 15)
  serverExternalPackages: ["sharp", "web-push"],
  poweredByHeader: false,
  // Browser security: HTTPS only, no sniffing file types, no framing of the site by other websites
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/super-league", destination: "/super-cup", permanent: true }];
  },
};
export default nextConfig;
