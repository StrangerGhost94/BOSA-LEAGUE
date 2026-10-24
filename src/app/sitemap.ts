import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The pages Google should list for "BOSA League" searches */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1, "daily"],
    ["/league", 0.9, "daily"],
    ["/fixtures", 0.9, "daily"],
    ["/live", 0.8, "always"],
    ["/champions-league", 0.8, "weekly"],
    ["/super-cup", 0.8, "weekly"],
    ["/teams", 0.8, "weekly"],
    ["/players", 0.7, "weekly"],
    ["/news", 0.7, "daily"],
    ["/gallery", 0.5, "weekly"],
    ["/rules", 0.5, "monthly"],
    ["/membership", 0.9, "monthly"],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, lastModified: new Date(), changeFrequency, priority }));
}
