import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import AuthWatch from "@/components/site/AuthWatch";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import ScrollReset from "@/components/site/ScrollReset";

export const metadata: Metadata = {
  metadataBase: new URL("https://graas.org.in"),
  title: { default: "GRAAS | Global Robotics And Automation Society", template: "%s | GRAAS" },
  description:
    "GRAAS membership connects students, professionals, colleges and industry in robotics and automation: live learning, campus chapters, competitions and real industrial problems.",
  openGraph: {
    type: "website",
    siteName: "GRAAS",
    title: "GRAAS | Global Robotics And Automation Society",
    description: "A global society for robotics and automation: students, schools, colleges, professionals and industry in one network.",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {/* Both read the page address. Inside Suspense, pages built on request (an event, opportunity, policy or
            QR page opened for the first time) stream the header in instead of failing. */}
        <Suspense fallback={null}>
          <ScrollReset />
        </Suspense>
        <Suspense fallback={<div className="sticky top-0 z-50 h-[4.25rem] border-b border-line bg-white/90" aria-hidden="true" />}>
          <Header />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <AuthWatch />
      </body>
    </html>
  );
}
