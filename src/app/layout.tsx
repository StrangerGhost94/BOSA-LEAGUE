import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/oswald";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CommandMenu } from "@/components/site/command-menu";
import { InstallPrompt } from "@/components/install-prompt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
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
  openGraph: { images: ["/crests/bosa-logo.png"] },
};

export const viewport: Viewport = { themeColor: "#060913", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
