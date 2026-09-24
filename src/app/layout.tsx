import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/oswald";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CommandMenu } from "@/components/site/command-menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "BOSA League · Bilal Institute Old Students Football", template: "%s · BOSA League" },
  description:
    "The official home of the BOSA League, BOSA Champions League and BOSA Super Cup. Fixtures, results, standings, teams, players and news from Henry's Pitch, Kabalagala.",
  icons: { icon: "/crests/bosa-logo.png", apple: "/crests/bosa-logo.png" },
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
        </Providers>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
