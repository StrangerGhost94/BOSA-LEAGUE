import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/oswald";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CommandMenu } from "@/components/site/command-menu";
import { InstallPrompt } from "@/components/install-prompt";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "BOSA League · Bilal Institute Old Students Football", template: "%s · BOSA League" },
  description:
    "The official home of the BOSA League, BOSA Champions League and BOSA Super Cup. Fixtures, results, standings, teams, players and news from Henry's Pitch, Kabalagala.",
  applicationName: "BOSA",
  appleWebApp: { capable: true, title: "BOSA", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  twitter: { card: "summary", images: ["/crests/bosa-logo.png"] },
  openGraph: { type: "website", siteName: "BOSA League", locale: "en_UG", images: ["/crests/bosa-logo.png"] },
  keywords: ["BOSA League", "BOSA", "Bilal Institute", "old students football", "Kabalagala", "Kampala", "Uganda football", "BOSA Champions League", "BOSA Super Cup"],
  // Google Search Console's HTML-tag check: set GOOGLE_SITE_VERIFICATION to the code it gives you (not needed with the DNS check)
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "BOSA League", alternateName: ["BOSA", "Bilal Institute Old Students Football"], publisher: { "@id": `${SITE_URL}/#org` } },
    {
      "@type": "SportsOrganization",
      "@id": `${SITE_URL}/#org`,
      name: "BOSA League",
      sport: "Soccer",
      url: SITE_URL,
      logo: `${SITE_URL}/crests/bosa-logo.png`,
      description: "Football league for the old students of Bilal Institute, played on Sundays at Henry's Pitch, Kabalagala.",
      location: { "@type": "Place", name: "Henry's Pitch", address: { "@type": "PostalAddress", addressLocality: "Kabalagala, Kampala", addressCountry: "UG" } },
    },
  ],
};

export const viewport: Viewport = { themeColor: "#060913", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Tells Google the site's name and logo, so a search for "BOSA League" shows it as the league's own site */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <Providers>
          {children}
          <CommandMenu />
          <InstallPrompt />
        </Providers>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
