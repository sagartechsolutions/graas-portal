import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";

export const metadata: Metadata = {
  metadataBase: new URL("https://graas.org.in"),
  title: { default: "GRAAS | Global Robotics And Automation Society", template: "%s | GRAAS" },
  description:
    "GRAAS is the robotics and automation society for students, colleges and industry: live lectures, college chapters, competitions and real industry problems.",
  openGraph: {
    type: "website",
    siteName: "GRAAS",
    title: "GRAAS | Global Robotics And Automation Society",
    description: "Don't just study robots. Build them. Pre-register for membership.",
  },
};

export const viewport: Viewport = { themeColor: "#f4f6fb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
