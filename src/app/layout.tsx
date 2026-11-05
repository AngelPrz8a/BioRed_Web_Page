import "@fontsource-variable/inter";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BioRed", template: "%s · BioRed" },
  description: "BioRed · Semillero de investigación · UNIMINUTO. Monitoreo ambiental con estaciones ESP32.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
