import Link from "next/link";
import { TONE, type Tone } from "@/lib/people";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 font-semibold",
  secondary: "bg-surface-2 text-foreground border border-border hover:bg-surface-3",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-13 px-6 text-base rounded-2xl min-h-12",
};

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function ButtonLink({
  href,
  children,
  variant,
  size,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonStyles(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl bg-surface border border-border p-5 animate-rise",
        glow && "animate-glow border-accent/40",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

const STATUS_STYLE = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-accent/15 text-accent",
  rejected: "bg-danger/15 text-danger",
} as const;

const STATUS_LABEL = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Contestada",
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 48,
  tone = "accent",
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  tone?: Tone;
  ring?: boolean;
}) {
  const color = TONE[tone].text;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-3 flex items-center justify-center font-semibold",
        ring && cn("ring-2", TONE[tone].ring),
        color,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name) || "?"
      )}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const style = {
    error: "border-danger/40 bg-danger/10 text-danger",
    success: "border-accent/40 bg-accent/10 text-accent",
    info: "border-border bg-surface-2 text-muted",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm", style)}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl bg-surface-2 border border-border px-4 text-base text-foreground placeholder:text-muted/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-muted">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
