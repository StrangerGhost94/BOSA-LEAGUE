import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BOSA",
    short_name: "BOSA",
    description: "BOSA League: fixtures, live scores, standings and members' area for Bilal Institute old students.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060913",
    theme_color: "#060913",
    categories: ["sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Fixtures", url: "/fixtures", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Table", url: "/league", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Live", url: "/live", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My card", url: "/members/card", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
