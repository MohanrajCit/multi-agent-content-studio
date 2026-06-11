import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import { AppSidebar } from "@/components/app-sidebar";

export const metadata: Metadata = {
  title: "AI Content Intelligence Studio",
  description:
    "Multi-agent content intelligence — research, strategy, drafting, and quality scoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl px-5 py-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
