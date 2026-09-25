/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "60mb" }, serverComponentsExternalPackages: ["sharp", "web-push"], instrumentationHook: true },
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/super-league", destination: "/super-cup", permanent: true }];
  },
};
export default nextConfig;
