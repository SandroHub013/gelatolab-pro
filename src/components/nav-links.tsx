"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Beaker,
  LayoutDashboard,
  SlidersHorizontal,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Le voci vivono qui e non nel layout: le icone sono componenti, e le funzioni
 * non possono attraversare il confine Server → Client come props.
 */
const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recipes", label: "Ricettario", icon: Beaker },
  { href: "/ingredients", label: "Ingredienti", icon: FlaskConical },
  { href: "/presets", label: "Preset", icon: SlidersHorizontal },
  { href: "/documentation", label: "Documentazione", icon: BookOpen },
];

/** La rotta corrente evidenzia la voce di menu che la contiene. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigazione principale"
      className="flex flex-1 flex-col gap-1 px-2 py-3"
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs ring-1 ring-sidebar-border"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigazione principale"
      className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto"
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium transition-colors duration-150 sm:w-auto sm:gap-1.5 sm:px-2.5",
              active
                ? "bg-accent text-accent-foreground ring-1 ring-border"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-3.5" />
            {/* `sr-only` e non `hidden`: sotto sm restano solo le icone, ma la
                voce deve conservare un nome accessibile. */}
            <span className="sr-only sm:not-sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
