import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";
import { SITE, SITE_URL } from "./site";

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
      className={`${FONT_VARIABLES} h-full antialiased`}
    >
      <head>
        {/*
          Visitors analytics — a literal tag in <head>, as the vendor specifies.
          Deliberately NOT next/script: `beforeInteractive` emits only a preload link
          into <head> and pushes the real element from a body script at runtime, so
          the tag never actually exists in the head of the served HTML.
          Rendered here it loads on every route, unconditionally, attributes verbatim.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- the vendor
            specifies this tag verbatim; adding async/defer would modify it. See the
            render-blocking note below. */}
        <script
          src="https://cdn.visitors.now/v.js"
          data-token="7b6945c7-eba5-47cf-b2e0-56b446e5fcfa"
          data-persist=""
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

