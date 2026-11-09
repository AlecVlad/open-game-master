import { ThemeApplier } from "@/lib/theme-mode";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import TopoBackground from "./TopoBackground";
import { ServerAddressButton } from "@/components/ServerAddressButton";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";
import { getLang } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import "./globals.css";

// The faces ship locally so builds never fetch fonts from a CDN.
// Geist includes full Cyrillic; Forum supplies Cyrillic glyphs where the
// original Cinzel and Source Serif 4 Latin subsets have no matching glyph.
const geistSans = localFont({
  src: "./fonts/geist-cyrillic.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-cyrillic.ttf",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const sourceSerif = localFont({
  src: [
    {
      path: "./fonts/source-serif-4.woff2",
      weight: "200 900",
      style: "normal",
      unicodeRange: "U+0000-024F, U+1E00-1EFF",
    },
    {
      path: "./fonts/source-serif-4-italic.woff2",
      weight: "200 900",
      style: "italic",
      unicodeRange: "U+0000-024F, U+1E00-1EFF",
    },
    {
      path: "./fonts/forum-cyrillic.ttf",
      weight: "400",
      style: "normal",
      unicodeRange: "U+0400-052F, U+1C80-1C8A, U+2DE0-2DFF, U+A640-A69F, U+2116",
    },
    {
      path: "./fonts/forum-cyrillic.ttf",
      weight: "400",
      style: "italic",
      unicodeRange: "U+0400-052F, U+1C80-1C8A, U+2DE0-2DFF, U+A640-A69F, U+2116",
    },
  ],
  variable: "--font-source-serif",
});

// Engraved-capitals display face for wordmarks, screen titles, and
// campaign names; body text stays on Geist/Source Serif.
const cinzel = localFont({
  src: [
    {
      path: "./fonts/cinzel.woff2",
      weight: "400 900",
      unicodeRange: "U+0000-024F, U+1E00-1EFF",
    },
    {
      path: "./fonts/forum-cyrillic.ttf",
      weight: "400",
      unicodeRange: "U+0400-052F, U+1C80-1C8A, U+2DE0-2DFF, U+A640-A69F, U+2116",
    },
  ],
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "Open Game Master",
  description: "Multiplayer D&D 5e campaigns with an AI Game Master.",
  applicationName: "Open Game Master",
  appleWebApp: {
    capable: true,
    title: "Open GM",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#181420",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The reader's interface language (src/lib/i18n): their cookie, else the
  // browser's, else English.
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${cinzel.variable} h-full antialiased`}
      // browser extensions inject attributes into <html> before React loads
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* The reader's theme and scale, applied to <html> before anything
            else paints (docs/vtt-parity-implementation-plan.md section 14). */}
        <ThemeApplier />
        <I18nProvider lang={lang}>
          {/* Dust motes first, so the contour canvas is drawn over them. */}
          <div className="ambient-dust" aria-hidden="true" />
          <TopoBackground />
          {children}
          {/* Every page: the QR and address a friend scans to add this server
              in the app or open it in a browser on the same network. */}
          <ServerAddressButton />
          {/* The app's own confirm and notice, asked from anywhere. */}
          <ConfirmHost />
        </I18nProvider>
      </body>
    </html>
  );
}
