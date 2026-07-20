import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Snowflake, BookOpen, Beaker, LayoutDashboard, SlidersHorizontal, FlaskConical } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";

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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recipes", label: "Ricettario", icon: Beaker },
  { href: "/ingredients", label: "Ingredienti", icon: FlaskConical },
  { href: "/presets", label: "Preset", icon: SlidersHorizontal },
  { href: "/documentation", label: "Documentazione", icon: BookOpen },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-muted/30 text-foreground">
        <div className="flex min-h-full">
          {/* Sidebar desktop */}
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
            <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
              <Snowflake className="size-6 text-sky-500" />
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight">GelatoLab Pro</div>
                <div className="text-[11px] text-muted-foreground">Calibrazione ricette</div>
              </div>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
              Dati indicativi · v0.1 P0
            </div>
          </aside>

          {/* Contenuto principale */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Nav mobile */}
            <header className="no-print sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:hidden">
              <Snowflake className="size-5 text-sky-500" />
              <span className="mr-2 text-sm font-bold">GelatoLab Pro</span>
              <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
