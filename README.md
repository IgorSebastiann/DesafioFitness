# Desafio Fitness

Aplicativo web de competição fitness entre duas pessoas (casal). Cada atividade validada
vale pontos; o ranking semanal e mensal define o vencedor de cada período.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Neon Postgres (RLS) · Better Auth ·
Vercel Blob (privado) · Recharts · Lucide · Zod · Vitest.

Arquitetura detalhada e decisões de regra de negócio: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md). Nota: a infraestrutura foi migrada de Supabase para Neon, Better Auth e Vercel Blob. As regras de negócio descritas no documento permanecem.

---

## 1. Instalação

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
```

## 2. Banco de dados (Neon Postgres)

O banco é o Postgres do Neon, provisionado pelo Marketplace da Vercel. A conexão fica em `DATABASE_URL`.

Aplique as migrations e o seed (com `.env.local` preenchido ou exportando `DATABASE_URL`):

```bash
npm run db:migrate
```

O script registra cada arquivo em `schema_migrations`, então pode ser executado de novo sem refazer o que já foi aplicado.

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o Neon (servidor) |
| `BETTER_AUTH_SECRET` | Segredo de sessão do Better Auth (string longa aleatória) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do app (usada nos links de e-mail) |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob privado (comprovações e fotos) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio dos e-mails de recuperação de senha (opcional em dev) |
| `CRON_SECRET` | Protege `/api/cron/close-periods` |

Sem `DATABASE_URL` e `BETTER_AUTH_SECRET`, o app mostra a tela de configuração incompleta.

## 4. Execução local

```bash
npm run dev        # http://localhost:3000
npm test           # regras de domínio + regras do banco (PostgreSQL)
npm run typecheck
npm run lint
npm run build
```

## 5. Testes

- `src/lib/domain/domain.test.ts`: regras puras de validação, períodos, empate e sequências.
- `tests/db/rules.test.ts`: executa as migrations reais em PostgreSQL (PGlite), como o papel `app_user`
  com a identidade definida em `app.user_id`. Cobre pontuação calculada no banco, duplicidade, duração
  mínima, data futura, limite diário, autoaprovação bloqueada, permissões de revisão, RLS, notificações,
  conquistas, auditoria, fechamento idempotente de períodos, vencedor, empate e a rotina automática.

## 6. Primeiros participantes

1. Cada pessoa cria a conta em `/cadastro`.
2. Um administrador é promovido **uma vez** pelo SQL (substitua pelo e-mail real), usando o
   Neon SQL Editor ou `psql` com `DATABASE_URL`:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from public.users where email = 'seu-email@exemplo.com');
   ```

3. Entre como administrador e abra **Administração**.

## 7. Primeiro desafio

Na área **Administração**:

1. **Desafios › Criar desafio**: nome, limite diário (padrão 2) e data de início.
2. **Participantes**: adicione as duas pessoas (o desafio aceita exatamente 2).
3. **Modalidades e pontuação**: ajuste pontos e duração mínima, ou desative modalidades.
4. **Premiações**: cadastre prêmios semanais ou mensais.

## 8. Fechamento automático dos períodos

A rota `GET /api/cron/close-periods` fecha semanas e meses encerrados, com o cabeçalho
`Authorization: Bearer <CRON_SECRET>`. Agende uma chamada diária (por exemplo, Vercel Cron em `vercel.json`).
O fechamento é idempotente.

## 9. Deploy

1. Suba o repositório para o GitHub.
2. Importe o projeto na Vercel (framework: Next.js).
3. Cadastre as variáveis da seção 3 no ambiente *Production* (a Vercel já injeta `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN` ao vincular as integrações).
4. Faça o deploy. Depois de cada nova migration, rode `npm run db:migrate` apontando para o banco de produção.

## 10. Segurança

- Pontos, status, limite diário e duplicidade são calculados e validados em **triggers do banco**;
  o frontend não envia pontuação.
- RLS habilitado em todas as tabelas. Cada consulta roda como o papel `app_user` (sem BYPASSRLS), com a identidade do usuário em `app.user_id`.
- Comprovações e fotos ficam no Vercel Blob **privado**. São servidas por rotas que checam o vínculo no banco.
- Alterações administrativas e de atividades são registradas em `audit_logs` (somente admin lê).

## 11. Estrutura

```
src/app/(auth)/        login, cadastro, recuperação de senha
src/app/(app)/         dashboard, atividades, calendário, ranking, premiações, conquistas, perfil,
                       notificações, administração
src/app/actions/       Server Actions (auth, atividades, perfil, admin)
src/app/api/           auth (Better Auth), upload e rotas de comprovação/foto, cron
src/lib/domain/        regras puras + testes
src/lib/data/          consultas de leitura (SQL)
src/lib/auth.ts        configuração do Better Auth
src/lib/db.ts          pool e withUser (papel app_user + identidade)
src/proxy.ts           proteção de rotas (Next 16)
db/migrations/         schema, regras, RLS, fechamento, grants
db/seed.sql            configuração inicial real
scripts/migrate.mjs    aplica migrations e seed
tests/db/              testes das regras no PostgreSQL
```

## 12. Pendências conhecidas

- Recuperação de senha só envia e-mail com `RESEND_API_KEY` configurada. Sem ela, o link é registrado apenas nos logs do servidor.
- Notificações são só dentro do app (sem e-mail ou push).
- Edição de comprovação (trocar a foto) não existe; o dono pode excluir a atividade pendente e registrar de novo.
- Feed de atividades, disputa em tempo real e retrospectiva mensal (ideias da conversa de referência) ficaram fora desta entrega.
