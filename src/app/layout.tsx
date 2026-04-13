import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Syne } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Memoria — Your Crew's Digital Album ✨",
  description:
    "Share photos & videos with your squad in original quality. No compression, no drama — just vibes.",
  keywords: [
    "photo sharing",
    "group album",
    "friend group photos",
    "original quality",
    "digital album",
  ],
  openGraph: {
    title: "Memoria — Your Crew's Digital Album ✨",
    description:
      "Share photos & videos with your squad in original quality. No compression, no drama — just vibes.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#06060e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${syne.variable} dark`}
    >
      <body className="min-h-screen bg-[#06060e] text-[#f0f0f5] antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
