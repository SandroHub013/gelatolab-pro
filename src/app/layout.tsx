import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Snowflake } from "lucide-react";
import "./globals.css";
import { MobileNav, SidebarNav } from "@/components/nav-links";
import { VoiceConsole } from "@/features/voice/voice-console";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GelatoLab Pro",
  description:
    "Creazione, calibrazione e ottimizzazione di ricette di gelato artigianale.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <a
          href="#contenuto"
          className="no-print sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Vai al contenuto
        </a>
        <div className="flex min-h-full">
          {/* Sidebar desktop */}
          <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
            <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <Snowflake className="size-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight">
                  GelatoLab Pro
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Calibrazione ricette
                </div>
              </div>
            </div>
            <SidebarNav />
            <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-muted-foreground">
              Dati indicativi · v0.1 P0
            </div>
          </aside>

          {/* Contenuto principale */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Nav mobile */}
            <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur-xl md:hidden">
              <Snowflake className="size-5 shrink-0 text-primary" />
              <span className="shrink-0 text-sm font-bold tracking-tight">
                GelatoLab Pro
              </span>
              <MobileNav />
            </header>
            <main id="contenuto" className="flex-1">
              {children}
            </main>
          </div>
        </div>
        <VoiceConsole />
      </body>
    </html>
  );
}
