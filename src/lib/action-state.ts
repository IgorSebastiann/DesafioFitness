/** Estado padrão retornado pelas Server Actions usadas com useActionState. */
export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function success(message?: string): ActionState {
  return { ok: true, message };
}

/** Converte erros do PostgREST/Postgres em mensagens para o usuário. */
export function friendlyDbError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "23505":
      return "Esta atividade já foi registrada.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "23514":
    case "P0001":
    case "P0002":
    case "23503":
    case "22001":
      return error.message ?? "Não foi possível concluir a ação.";
    default:
      // Mensagens levantadas pelos triggers são escritas para o usuário final.
      return error.message && !error.message.includes("policy")
        ? error.message
        : "Não foi possível concluir a ação. Tente novamente.";
  }
}
