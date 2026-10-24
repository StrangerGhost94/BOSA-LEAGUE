/** The league's public domain. Printed cards, QR codes and link previews always point here. */
export const SITE_DOMAIN = "bosaleague.xyz";

const env = (process.env.APP_URL || "").replace(/\/$/, "");
const isOld = (u: string) => !u || u.includes("localhost") || u.includes(".up.railway.app");

/** Public address of the site: APP_URL when it is a real domain, else https://bosaleague.xyz (never Railway's old address) */
export const SITE_URL = isOld(env) ? `https://${SITE_DOMAIN}` : env;

/** Address this server is reached on for payment callbacks: APP_URL (localhost in development), never Railway's old address */
export const APP_URL = !env || env.includes(".up.railway.app") ? SITE_URL : env;

/** Search-friendly page details: its own description and canonical address, shared by Google and link previews */
export function pageMeta(path: string, title: string, description: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · BOSA League`, description, url: path, type: "website" as const, siteName: "BOSA League", images: ["/crests/bosa-logo.png"] },
  };
}
