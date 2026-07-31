import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SITE, SITE_URL } from "./site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face — high-contrast editorial serif with a true italic, matching the
// roman/italic mix in the reference poster (DESIGN.md §4). One weight, tiny file.
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  // Required for OG/Twitter images to resolve to absolute URLs (see ./site.ts).
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.shortTitle}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.creator, url: SITE.creatorUrl }],
  creator: SITE.creator,
  publisher: SITE.name,
  category: "culture",
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    title: SITE.title,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage.url,
        width: SITE.ogImage.width,
        height: SITE.ogImage.height,
        alt: SITE.ogImage.alt,
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: [{ url: SITE.ogImage.url, alt: SITE.ogImage.alt }],
    creator: SITE.creatorHandle,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // The page is a full-bleed WebGL canvas; phone number detection would be noise.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  // Matches --paper, so the mobile browser chrome blends into the gallery wall.
  themeColor: "#EFEDE8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Zoom stays enabled. The canvas already suppresses its own gestures via
  // `touch-action: none`, and the info panel is real prose someone may need to
  // enlarge — blocking pinch-zoom site-wide would fail WCAG 1.4.4.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE.lang}
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
