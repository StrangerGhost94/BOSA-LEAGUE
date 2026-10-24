import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Search engines may read the public site; staff desks, accounts and payment pages stay out of results */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/team-panel", "/referee", "/live-desk", "/account", "/members$", "/members/", "/membership/callback", "/verify", "/print", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
