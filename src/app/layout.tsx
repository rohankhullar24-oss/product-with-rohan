import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/lib/theme-context";
import StructuredData from "@/components/StructuredData";
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
  title: "Rohan Khullar | Product Manager | AI & Fintech Growth Strategy",
  description:
    "Product Manager with 4+ years driving product strategy for B2B fintech. Expertise in platform growth, payments, and AI automation. 600K+ users, ₹7Cr GMV, 73% conversion.",
  keywords: [
    "Product Manager",
    "Product Strategy",
    "B2B SaaS",
    "Fintech",
    "Growth",
    "AI Automation",
    "Platform",
    "Payments",
  ],
  authors: [{ name: "Rohan Khullar", url: "https://productwithrohan.online" }],
  creator: "Rohan Khullar",
  metadataBase: new URL("https://productwithrohan.online"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://productwithrohan.online",
    siteName: "Product with Rohan",
    title: "Rohan Khullar | Product Manager | AI & Fintech Growth Strategy",
    description:
      "Product Manager with 4+ years driving product strategy for B2B fintech. Expertise in platform growth, payments, and AI automation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rohan Khullar | Product Manager",
    description:
      "Product Manager with 4+ years driving product strategy for B2B fintech.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
