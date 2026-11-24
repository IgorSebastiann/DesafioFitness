"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";
import { CATEGORIES, EQUIPMENT, LEVELS, MECHANICS, MUSCLES, slugify } from "@/lib/domain/exercises";
import { OWN_VIDEO, isMediaUrl } from "@/lib/media-blob";

const muscleCodes = MUSCLES.map((m) => m.code) as [string, ...string[]];
const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Texto de várias linhas → lista (uma linha por item, sem vazias). */
const lines = (max: number, label: string) =>
  z
    .string()
    .transform((s) =>
      s
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*(\d+[.)-]|[-•*])\s*/, "").trim())
        .filter(Boolean),
    )
    .refine((xs) => xs.length <= max, { error: `${label}: no máximo ${max} itens.` })
    .refine((xs) => xs.every((x) => x.length <= 400), { error: `${label}: cada item pode ter até 400 caracteres.` });

const exerciseSchema = z
  .object({
    name: z.string().trim().min(3, { error: "O nome precisa ter pelo menos 3 caracteres." }).max(80),
    slug: z.string().trim().max(80).optional(),
    primaryMuscle: z.enum(muscleCodes, { error: "Escolha o músculo principal." }),
    secondaryMuscles: z.array(z.enum(muscleCodes)).max(6, { error: "No máximo 6 músculos secundários." }),
    equipment: z.enum(keys(EQUIPMENT), { error: "Escolha o equipamento." }),
    level: z.enum(keys(LEVELS), { error: "Escolha o nível." }),
    mechanic: z.enum(keys(MECHANICS), { error: "Escolha o tipo." }),
    category: z.enum(keys(CATEGORIES), { error: "Escolha a categoria." }),
    steps: lines(15, "Execução"),
    commonMistakes: lines(10, "Erros comuns"),
    tips: lines(10, "Dicas"),
    isActive: z.boolean(),
  })
  .refine((v) => v.steps.length > 0, { error: "Escreva ao menos um passo da execução.", path: ["steps"] });

function parseExercise(formData: FormData) {
  return exerciseSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? undefined,
    primaryMuscle: formData.get("primaryMuscle"),
    secondaryMuscles: formData.getAll("secondaryMuscles"),
    equipment: formData.get("equipment"),
    level: formData.get("level"),
    mechanic: formData.get("mechanic"),
    category: formData.get("category"),
    steps: formData.get("steps") ?? "",
    commonMistakes: formData.get("commonMistakes") ?? "",
    tips: formData.get("tips") ?? "",
    isActive: formData.get("isActive") === "on",
  });
}

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) throw new Error("Somente administradores.");
  return viewer;
}

const dbError = (error: unknown) => {
  const e = error as { code?: string; message?: string; constraint?: string };
  if (e.code === "23505") return "Já existe um exercício com esse nome ou endereço.";
  return friendlyDbError(e);
};

export async function saveExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin().catch(() => null);
  if (!viewer) return fail("Somente administradores podem editar exercícios.");

  const parsed = parseExercise(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  const id = String(formData.get("id") ?? "") || null;
  const slug = slugify(data.slug || data.name);
  if (slug.length < 3) return fail("O endereço (slug) precisa ter pelo menos 3 letras ou números.");
  const secondary = data.secondaryMuscles.filter((m) => m !== data.primaryMuscle);

  try {
    await withUser(viewer.userId, async (sql) => {
      const values = [
        slug, data.name, data.primaryMuscle, data.equipment, data.level, data.mechanic, data.category,
        data.steps, data.commonMistakes, data.tips, data.isActive,
      ];
      const { rows } = id
        ? await sql.query<{ id: string }>(
            `update exercises set slug = $1, name = $2, primary_muscle = $3, equipment = $4, level = $5, mechanic = $6,
                    category = $7, steps = $8, common_mistakes = $9, tips = $10, is_active = $11
              where id = $12 returning id`,
            [...values, id],
          )
        : await sql.query<{ id: string }>(
            `insert into exercises (slug, name, primary_muscle, equipment, level, mechanic, category, steps,
                                    common_mistakes, tips, is_active, text_source)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'own') returning id`,
            values,
          );
      const exerciseId = rows[0]?.id;
      if (!exerciseId) throw Object.assign(new Error("Exercício não encontrado."), { code: "P0002" });
      await sql.query(`delete from exercise_secondary_muscles where exercise_id = $1 and not (muscle = any($2))`, [
        exerciseId,
        secondary,
      ]);
      await sql.query(
        `insert into exercise_secondary_muscles (exercise_id, muscle)
         select $1, m from unnest($2::text[]) m on conflict do nothing`,
        [exerciseId, secondary],
      );
    });
  } catch (error) {
    return fail(dbError(error));
  }

  revalidatePath("/exercicios");
  redirect(`/exercicios/${slug}/editar?salvo=1`);
}

// ---------------------------------------------------------------------------
// Mídias próprias
// ---------------------------------------------------------------------------
const ownMediaSchema = z.object({
  exerciseId: z.uuid(),
  kind: z.enum(["video", "image"]),
  angle: z.enum(["front", "side", "back"]),
  url: z.string().refine(isMediaUrl, { error: "Arquivo inválido." }),
  posterUrl: z.string().refine(isMediaUrl).nullable(),
  width: z.number().int().min(1).max(10000).nullable(),
  height: z.number().int().min(1).max(10000).nullable(),
  durationMs: z
    .number()
    .int()
    .min(1)
    .max(OWN_VIDEO.maxSeconds * 1000 + 500, { error: `O vídeo pode ter até ${OWN_VIDEO.maxSeconds} segundos.` })
    .nullable(),
  makePrimary: z.boolean(),
});

/** Registra uma mídia própria já enviada ao Blob público (origem e licença "própria"). */
export async function addOwnMedia(input: z.input<typeof ownMediaSchema>): Promise<ActionState> {
  const viewer = await requireAdmin().catch(() => null);
  if (!viewer) return fail("Somente administradores podem enviar mídias.");
  const parsed = ownMediaSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const m = parsed.data;

  let slug: string | undefined;
  try {
    slug = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ slug: string }>(`select slug from exercises where id = $1`, [m.exerciseId]);
      if (!rows[0]) throw Object.assign(new Error("Exercício não encontrado."), { code: "P0002" });
      if (!m.url.includes(`/exercises/${rows[0].slug}/own-`)) {
        throw Object.assign(new Error("Arquivo inválido."), { code: "P0001" });
      }
      if (m.makePrimary) await sql.query(`update exercise_media set is_primary = false where exercise_id = $1`, [m.exerciseId]);
      await sql.query(
        `insert into exercise_media (exercise_id, kind, angle, position, url, poster_url, origin, license,
                                     is_primary, width, height, duration_ms, created_by)
         values ($1, $2, $3, coalesce((select max(position) + 1 from exercise_media where exercise_id = $1), 0),
                 $4, $5, 'own', 'own', $6, $7, $8, $9, $10)`,
        [m.exerciseId, m.kind, m.angle, m.url, m.posterUrl, m.makePrimary, m.width, m.height, m.kind === "video" ? m.durationMs : null, viewer.userId],
      );
      return rows[0].slug;
    });
  } catch (error) {
    await deleteBlobs([m.url, m.posterUrl]);
    return fail(dbError(error));
  }
  revalidatePath(`/exercicios/${slug}`);
  revalidatePath("/exercicios");
  return success("Mídia adicionada.");
}

const mediaUpdateSchema = z.object({
  mediaId: z.uuid(),
  angle: z.enum(["front", "side", "back"]).optional(),
  position: z.number().int().min(0).max(99).optional(),
  isPrimary: z.boolean().optional(),
});

/** Ajusta ângulo, ordem ou a mídia principal. */
export async function updateMedia(input: z.input<typeof mediaUpdateSchema>): Promise<ActionState> {
  const viewer = await requireAdmin().catch(() => null);
  if (!viewer) return fail("Somente administradores.");
  const parsed = mediaUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const m = parsed.data;
  let slug: string | undefined;
  try {
    slug = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ exercise_id: string; slug: string }>(
        `select m.exercise_id, e.slug from exercise_media m join exercises e on e.id = m.exercise_id where m.id = $1`,
        [m.mediaId],
      );
      const row = rows[0];
      if (!row) throw Object.assign(new Error("Mídia não encontrada."), { code: "P0002" });
      if (m.isPrimary) await sql.query(`update exercise_media set is_primary = false where exercise_id = $1`, [row.exercise_id]);
      await sql.query(
        `update exercise_media set angle = coalesce($2, angle), position = coalesce($3, position),
                is_primary = coalesce($4, is_primary) where id = $1`,
        [m.mediaId, m.angle ?? null, m.position ?? null, m.isPrimary ?? null],
      );
      return row.slug;
    });
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath(`/exercicios/${slug}`);
  revalidatePath(`/exercicios/${slug}/editar`);
  return success("Mídia atualizada.");
}

/** Remove a mídia do banco e o arquivo do Blob público. */
export async function deleteMedia(mediaId: string): Promise<ActionState> {
  const viewer = await requireAdmin().catch(() => null);
  if (!viewer) return fail("Somente administradores.");
  if (!z.uuid().safeParse(mediaId).success) return fail("Mídia inválida.");
  let removed: { url: string; poster_url: string | null; slug: string } | undefined;
  try {
    removed = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ url: string; poster_url: string | null; slug: string }>(
        `delete from exercise_media m using exercises e
          where m.id = $1 and e.id = m.exercise_id
          returning m.url, m.poster_url, e.slug`,
        [mediaId],
      );
      return rows[0];
    });
  } catch (error) {
    return fail(dbError(error));
  }
  if (!removed) return fail("Mídia não encontrada.");
  await deleteBlobs([removed.url, removed.poster_url]);
  revalidatePath(`/exercicios/${removed.slug}`);
  revalidatePath(`/exercicios/${removed.slug}/editar`);
  revalidatePath("/exercicios");
  return success("Mídia removida.");
}

async function deleteBlobs(urls: Array<string | null>) {
  const token = process.env.MEDIA_READ_WRITE_TOKEN;
  const valid = urls.filter((u): u is string => Boolean(u && isMediaUrl(u)));
  if (!token || valid.length === 0) return;
  await del(valid, { token }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Perfil: desenho do corpo
// ---------------------------------------------------------------------------
export async function setBodyFigure(value: unknown): Promise<ActionState> {
  const viewer = await getViewer();
  if (value !== "male" && value !== "female") return fail("Escolha masculino ou feminino.");
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update profiles set body_figure = $1 where id = $2`, [value, viewer.userId]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/perfil");
  revalidatePath("/exercicios", "layout");
  return success("Desenho do corpo atualizado.");
}
