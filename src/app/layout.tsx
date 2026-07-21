import type { Metadata } from "next";
import { Fraunces, Work_Sans, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CursorGlow } from "@/components/layout/cursor-glow";
import { SeasonProvider } from "@/components/layout/season-provider";
import { SeasonAtmosphere } from "@/components/layout/season-atmosphere";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

// Work Sans instead of Inter - same neutrality where it needs to disappear
// (body copy), but warmer, more humanist letterforms than Inter's very
// standard, very "default UI" shapes.
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

// Handwritten accent - used sparingly (eyebrows, small annotations) for
// the "note pinned to the page" feel, never for body copy or anything
// that needs to be easily scannable.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Every story starts somewhere.",
  description: "The story of two people, two countries, and everything in between.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "Every story starts somewhere.",
    description: "The story of two people, two countries, and everything in between.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${workSans.variable} ${mono.variable} ${caveat.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SeasonProvider>
            <SeasonAtmosphere />
            <CursorGlow />
            <Navbar />
            <main>{children}</main>
            <Footer />
          </SeasonProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
