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
  title: "ZMAIL — Enterprise Email Operations Platform",
  description: "Enterprise email operations platform for high-performance delivery, domain authentication, and real-time reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600,700,800,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full w-full overflow-hidden bg-[#010102] text-[#f7f8f8]">
        {children}
      </body>
    </html>
  );
}
