import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getServerLocale } from "@/lib/i18n-server";

const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atelier Archive",
  description: "Curated antique art and collectible objects",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale()

  return (
    <html lang={locale}>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased`}
      >
        <SiteHeader initialLocale={locale} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
