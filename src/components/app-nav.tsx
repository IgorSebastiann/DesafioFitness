"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Download,
  Dumbbell,
  Flame,
  Gift,
  Images,
  House,
  ListChecks,
  Medal,
  Plus,
  Swords,
  ShieldCheck,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { SignOutForm } from "@/components/signout-form";
import { cn } from "@/lib/cn";

const MOBILE_TABS = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/ranking", label: "Ranking", icon: Trophy },
] as const;

/** Itens que, no celular, ficam na gaveta "Mais". */
const MORE_LINKS = [
  { href: "/treinos", label: "Treinos", icon: ClipboardList },
  { href: "/desafio", label: "Meu desafio", icon: Swords },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/galeria", label: "Galeria", icon: Images },
  { href: "/premiacoes", label: "Premiações", icon: Gift },
  { href: "/conquistas", label: "Conquistas", icon: Medal },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/instalar", label: "Instalar o app", icon: Download },
] as const;

const SIDE_LINKS = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/desafio", label: "Meu desafio", icon: Swords },
  { href: "/atividades/nova", label: "Registrar atividade", icon: Plus },
  { href: "/treinos", label: "Treinos", icon: ClipboardList },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/galeria", label: "Galeria", icon: Images },
  { href: "/premiacoes", label: "Premiações", icon: Gift },
  { href: "/conquistas", label: "Conquistas", icon: Medal },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/instalar", label: "Instalar o app", icon: Download },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/exercicios" && pathname === "/creditos") return true;
  if (href === "/atividades") return pathname.startsWith("/atividades") && pathname !== "/atividades/nova";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  const pathname = usePathname();

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

      {/* Mobile: barra inferior fixa + gaveta "Mais" (estilo Instagram/TikTok) */}
      <MobileNav pathname={pathname} isAdmin={isAdmin} unread={unread} />
    </>
  );
}

function MobileNav({ pathname, isAdmin, unread }: { pathname: string; isAdmin: boolean; unread: number }) {
  const [open, setOpen] = useState(false);
  const newActive = pathname === "/atividades/nova";
  const moreLinks = isAdmin ? [...MORE_LINKS, { href: "/admin", label: "Administração", icon: ShieldCheck }] : MORE_LINKS;
  const moreActive = moreLinks.some(({ href }) => isActive(pathname, href));

  // Gaveta aberta: trava a rolagem da página e fecha com Esc.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-2">
          {MOBILE_TABS.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <TabItem key={href} href={href} label={label} icon={Icon} active={!open && isActive(pathname, href)} onClick={close} />
          ))}
          <li className="relative flex h-14 justify-center">
            <Link
              href="/atividades/nova"
              aria-label="Registrar atividade"
              aria-current={newActive ? "page" : undefined}
              onClick={close}
              className="absolute -top-6 left-1/2 flex h-14 -translate-x-1/2 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/20 active:scale-95"
            >
              <Plus className="h-7 w-7" aria-hidden />
            </Link>
          </li>
          {MOBILE_TABS.slice(2).map(({ href, label, icon: Icon }) => (
            <TabItem key={href} href={href} label={label} icon={Icon} active={!open && isActive(pathname, href)} onClick={close} />
          ))}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "relative flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium",
                open || moreActive ? "text-accent" : "text-muted",
              )}
            >
              <Menu className="h-5 w-5" aria-hidden />
              Mais
              {unread > 0 ? (
                <span
                  className="absolute right-[calc(50%-16px)] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface"
                  aria-hidden
                />
              ) : null}
              {unread > 0 ? (
                <span className="sr-only">, {unread} notificações não lidas</span>
              ) : null}
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={close}
            className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div
            className="animate-sheet absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-3" aria-hidden />
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Menu</span>
              <button type="button" onClick={close} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {moreLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl px-3 py-2 text-base font-medium transition active:scale-[0.99]",
                        active ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl",
                          active ? "bg-accent/20" : "bg-surface-2",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="flex-1">{label}</span>
                      {href === "/notificacoes" && unread > 0 ? (
                        <span className="rounded-full bg-accent px-2 text-xs font-bold text-accent-ink">{unread}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 border-t border-border pt-2">
              <SignOutForm>
                <button className="flex w-full items-center gap-4 rounded-2xl px-3 py-2 text-base font-medium text-danger hover:bg-surface-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
                    <LogOut className="h-5 w-5" aria-hidden />
                  </span>
                  Sair
                </button>
              </SignOutForm>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
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
