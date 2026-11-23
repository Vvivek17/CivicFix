import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicFix — Better neighborhoods, together",
  description: "See it. Report it. Get it fixed. Report civic issues with photos and GPS, support your neighbors, and track real community improvements.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#214f39" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
