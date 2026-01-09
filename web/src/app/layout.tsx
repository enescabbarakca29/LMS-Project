import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";
import Navbar from "@/app/components/Navbar";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";


export const metadata: Metadata = {
  title: "LMS Web",
  description: "Web LMS Prototype",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="antialiased min-h-screen font-sans bg-black text-white">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

          {/* PWA Service Worker register */}
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
