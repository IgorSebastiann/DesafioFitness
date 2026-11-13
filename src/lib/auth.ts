import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/env";

/**
 * Autenticação com Better Auth (e-mail e senha) sobre o Postgres do Neon.
 * As tabelas usam os nomes abaixo para não colidir com outras aplicações no mesmo banco.
 */
export const auth = betterAuth({
  baseURL: SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: {
    database: {
      // Ids em UUID, como no restante do schema.
      generateId: () => crypto.randomUUID(),
    },
  },
  user: { modelName: "users" },
  session: { modelName: "sessions" },
  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Redefinir sua senha · Desafio Fitness",
        html: `<p>Olá, ${user.name}.</p><p>Para criar uma nova senha, <a href="${url}">clique aqui</a>. O link expira em 1 hora.</p>`,
      });
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
