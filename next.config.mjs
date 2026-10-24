/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
  // Server-only packages loaded at runtime instead of bundled (instrumentation is always on in Next 15)
  serverExternalPackages: ["sharp", "web-push"],
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/super-league", destination: "/super-cup", permanent: true }];
  },
};
export default nextConfig;
