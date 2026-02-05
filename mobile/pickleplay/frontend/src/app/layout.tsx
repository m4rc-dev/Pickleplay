import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PicklePlay Philippines - Find Pickleball Courts Near You",
  description:
    "PicklePlay.ph helps you discover pickleball courts across the Philippines. Search by location, view court details, and get directions to start playing pickleball anywhere in the country!",
  openGraph: {
    title: "PicklePlay Philippines - Find Pickleball Courts Near You",
    description:
      "PicklePlay.ph helps you discover pickleball courts across the Philippines. Search by location, view court details, and get directions to start playing pickleball anywhere in the country!",
    url: "https://pickleplay.ph",
    siteName: "PicklePlay Philippines",
    locale: "en_PH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
