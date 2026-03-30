import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const THEME_COLOR = "#ea580c";

export const metadata: Metadata = {
  title: "JTN Scheduler",
  description: "JTN client queue and progress scheduler",
  applicationName: "JTN Scheduler",
  appleWebApp: {
    capable: true,
    title: "JTN Scheduler",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": THEME_COLOR,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen bg-stone-50 font-sans antialiased overflow-x-hidden">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
