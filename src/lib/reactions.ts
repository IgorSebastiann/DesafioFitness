/** Emojis aceitos nas reações (iguais à lista do banco, migration 0009). */
export const REACTIONS = ["🔥", "💪", "👏", "😮", "❤️"] as const;
export type Reaction = (typeof REACTIONS)[number];
