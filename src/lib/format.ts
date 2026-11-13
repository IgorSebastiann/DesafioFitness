/** Nome exibido: apelido quando existir, senão o nome completo. */
export function displayName(
  p: { display_name: string; nickname?: string | null } | null | undefined,
): string {
  if (!p) return "Participante";
  return p.nickname?.trim() || p.display_name;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
