import type { Metadata } from "next";

import { Providers } from "@/global/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pralay",
  description: "AI creative platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
