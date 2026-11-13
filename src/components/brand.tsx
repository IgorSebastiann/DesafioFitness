import { Flame } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <Flame className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-extrabold uppercase tracking-[0.16em]">Desafio Fitness</span>
    </div>
  );
}
