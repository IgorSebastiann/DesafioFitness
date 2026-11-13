/**
 * Regras de pontuação — espelho puro das regras aplicadas no banco (migration 0002).
 * A validação definitiva é feita pelos triggers do PostgreSQL; esta função serve para
 * feedback imediato no formulário e para testes unitários. Nunca confie só nela.
 */

export const TIME_ZONE = "America/Sao_Paulo";
export const DEFAULT_DAILY_POINT_LIMIT = 2;

export type ActivityStatus = "pending" | "approved" | "rejected";

export type ActivityRuleCode =
  | "CATEGORY_INACTIVE"
  | "FUTURE_DATE"
  | "DUPLICATE"
  | "MIN_DURATION"
  | "DAILY_LIMIT";

export type ActivityRuleInput = {
  categoryName: string;
  categoryActive: boolean;
  categoryPoints: number;
  minDurationMinutes: number;
  durationMinutes: number;
  dailyPointLimit: number;
  /** Soma dos pontos de atividades do dia que NÃO estão rejeitadas (exclui a atual). */
  pointsUsedToday: number;
  activityDate: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD no fuso de São Paulo
  isDuplicate: boolean;
};

export type ActivityRuleResult =
  | { ok: true }
  | { ok: false; code: ActivityRuleCode; message: string };

/** Valida uma nova atividade, na mesma ordem usada pelo banco. */
export function validateActivityRules(input: ActivityRuleInput): ActivityRuleResult {
  if (!input.categoryActive) {
    return fail("CATEGORY_INACTIVE", "Esta modalidade não está disponível.");
  }
  if (input.activityDate > input.today) {
    return fail("FUTURE_DATE", "Não é possível registrar atividades em datas futuras.");
  }
  if (input.isDuplicate) {
    return fail("DUPLICATE", "Esta atividade já foi registrada.");
  }
  if (input.durationMinutes < input.minDurationMinutes) {
    return fail(
      "MIN_DURATION",
      `Duração mínima para ${input.categoryName} é de ${input.minDurationMinutes} minutos.`,
    );
  }
  if (input.pointsUsedToday + input.categoryPoints > input.dailyPointLimit) {
    return fail(
      "DAILY_LIMIT",
      `Limite diário de ${input.dailyPointLimit} pontos atingido.`,
    );
  }
  return { ok: true };
}

/** Pontos válidos de uma atividade: só contam quando aprovada. */
export function validPointsFor(status: ActivityStatus, categoryPoints: number): number {
  return status === "approved" ? categoryPoints : 0;
}

function fail(code: ActivityRuleCode, message: string): ActivityRuleResult {
  return { ok: false, code, message };
}
