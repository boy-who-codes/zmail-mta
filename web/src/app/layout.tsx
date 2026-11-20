import type { Metadata } from "next";
import "./globals.css";

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
      className="h-full antialiased font-sans"
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
