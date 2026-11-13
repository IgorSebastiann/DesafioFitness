"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Flame,
  Gift,
  House,
  ListChecks,
  Medal,
  Plus,
  Swords,
  ShieldCheck,
  Trophy,
  User,
  LogOut,
} from "lucide-react";
import { SignOutForm } from "@/components/signout-form";
import { cn } from "@/lib/cn";

const MOBILE_TABS = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

const SIDE_LINKS = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/desafio", label: "Meu desafio", icon: Swords },
  { href: "/atividades/nova", label: "Registrar atividade", icon: Plus },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/premiacoes", label: "Premiações", icon: Gift },
  { href: "/conquistas", label: "Conquistas", icon: Medal },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/atividades") return pathname.startsWith("/atividades") && pathname !== "/atividades/nova";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  const pathname = usePathname();
  const newActive = pathname === "/atividades/nova";

  return (
    <>
      {/* Desktop: menu lateral */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/60 px-4 py-8 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <Flame className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-extrabold uppercase tracking-[0.16em]">Desafio Fitness</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
          {SIDE_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/notificacoes" && unread > 0 ? (
                  <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-ink">{unread}</span>
                ) : null}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              aria-current={isActive(pathname, "/admin") ? "page" : undefined}
              className={cn(
                "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(pathname, "/admin") ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <ShieldCheck className="h-5 w-5" aria-hidden />
              Administração
            </Link>
          ) : null}
        </nav>

        <SignOutForm>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground">
            <LogOut className="h-5 w-5" aria-hidden />
            Sair
          </button>
        </SignOutForm>
      </aside>

      {/* Mobile: navegação inferior */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
          {MOBILE_TABS.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <TabItem key={href} href={href} label={label} icon={Icon} active={isActive(pathname, href)} />
          ))}
          <li className="flex justify-center">
            <Link
              href="/atividades/nova"
              aria-label="Registrar atividade"
              aria-current={newActive ? "page" : undefined}
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/20 active:scale-95"
            >
              <Plus className="h-7 w-7" aria-hidden />
            </Link>
          </li>
          {MOBILE_TABS.slice(2).map(({ href, label, icon: Icon }) => (
            <TabItem key={href} href={href} label={label} icon={Icon} active={isActive(pathname, href)} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
          active ? "text-accent" : "text-muted",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {label}
      </Link>
    </li>
  );
}
