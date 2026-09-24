/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "60mb" }, serverComponentsExternalPackages: ["sharp"] },
  poweredByHeader: false,
};
export default nextConfig;
