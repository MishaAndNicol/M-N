import type { Metadata } from "next";
import { Playfair_Display, Work_Sans, IBM_Plex_Mono, Cormorant } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CursorGlow } from "@/components/layout/cursor-glow";
import { SeasonProvider } from "@/components/layout/season-provider";
import { SeasonAtmosphere } from "@/components/layout/season-atmosphere";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
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

// Night-mode display face - taller, cooler, more wind-blown than
// Playfair Display. Swapped in purely via the --font-display CSS
// variable (globals.css), so every heading site-wide changes register
// between themes without touching a single component.
const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
      <body className={`${playfair.variable} ${workSans.variable} ${mono.variable} ${cormorant.variable}`}>
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
