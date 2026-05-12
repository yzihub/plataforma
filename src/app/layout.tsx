import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Jurema Brokers",
  title: {
    default:  "Jurema Brokers",
    template: "%s | Jurema Brokers",
  },
  description: "Plataforma operacional Jurema Brokers",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Jurema Brokers",
    description: "Plataforma operacional Jurema Brokers",
    siteName: "Jurema Brokers",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/images/jurema/favicon-black-192.ico", sizes: "192x192" },
      { url: "/images/jurema/favicon-black-512.ico", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg?v=2",
    apple: [
      { url: "/images/jurema/favicon-black-192.ico", sizes: "192x192" },
    ],
    other: [
      {
        rel: "icon",
        media: "(prefers-color-scheme: dark)",
        url: "/favicon.svg?v=2",
      },
      {
        rel: "icon",
        media: "(prefers-color-scheme: light)",
        url: "/favicon.svg?v=2",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
