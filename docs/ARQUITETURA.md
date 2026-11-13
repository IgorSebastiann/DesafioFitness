# Arquitetura — Desafio Fitness

## 1. Visão geral

```
Navegador (mobile-first)
   │  Next.js 16 App Router (React Server Components + Server Actions)
   │  proxy.ts → renova sessão e protege rotas
   ▼
Supabase
   ├─ Auth            → e-mail/senha, recuperação de senha
   ├─ PostgreSQL      → tabelas, RLS, triggers (regras de pontuação), views/funções de ranking
   └─ Storage         → buckets `proofs` (comprovações, privado) e `avatars` (público)
```

Princípio central: **a verdade está no banco**. O frontend apenas envia intenção
(tipo de atividade, data, duração, arquivo). Pontos, status, limite diário,
duplicidade, duração mínima e permissões de aprovação são validados por triggers
PostgreSQL e por RLS. A validação TypeScript (`src/lib/domain`) existe para feedback
imediato na tela e para testes — nunca é a única barreira.

## 2. Estrutura de pastas

```
src/
  app/
    (auth)/            login, cadastro, recuperar-senha, atualizar-senha
    auth/callback/     troca de código do Supabase (link de recuperação)
    (app)/             área logada com navegação (bottom nav / sidebar)
      dashboard/       placar, estatísticas, ranking, últimas atividades
      atividades/      histórico, nova atividade, detalhe + validação
      calendario/      calendário mensal por participante
      ranking/         semanal × mensal + histórico de períodos
      premiacoes/      prêmios configurados + vencedores
      conquistas/      medalhas
      perfil/          perfil individual + foto
      notificacoes/
      admin/           área protegida (role = admin)
    actions/           Server Actions (auth, atividades, perfil, admin)
    api/cron/          fechamento automático de períodos (CRON_SECRET)
  components/          UI reutilizável (shadcn-style, sem dependências extras)
  lib/
    domain/            regras puras (pontuação, períodos, streaks) + testes
    supabase/          clientes browser/server/proxy/admin
    format.ts          formatação pt-BR
  proxy.ts             Next 16: substitui middleware.ts
supabase/
  migrations/          0001 schema · 0002 funções/triggers · 0003 RLS · 0004 storage · 0005 ranking
  seed.sql             apenas configuração inicial real (modalidades e limites da especificação)
docs/ARQUITETURA.md    este arquivo
```

## 3. Modelo de dados

| Tabela | Papel |
|---|---|
| `profiles` | 1:1 com `auth.users`; nome, apelido, foto, `role` (`member`/`admin`) |
| `challenges` | Um desafio; `daily_point_limit` (padrão 2) |
| `challenge_participants` | Vínculo usuário ↔ desafio. Trigger impede mais de 2 participantes |
| `activity_categories` | Modalidades: pontos, duração mínima, ativa/inativa (configurável pelo admin) |
| `activities` | Registro de atividade + comprovação. `points_awarded` é **sempre calculado** pelo trigger |
| `activity_approvals` | Histórico de cada decisão (quem, quando, decisão, observação) |
| `awards` | Configuração de premiações semanal/mensal |
| `weekly_results` / `monthly_results` | Fechamento imutável de cada período (pontos, vencedor, empate) |
| `achievements` / `user_achievements` | Catálogo de conquistas e as desbloqueadas por usuário/desafio |
| `notifications` | Notificações in-app |
| `audit_logs` | Log de INSERT/UPDATE/DELETE nas tabelas sensíveis (somente admin lê) |

### Decisões de regra de negócio (interpretações)

1. **Pontuação**: cada atividade válida vale `activity_categories.points` (1 por padrão).
   Uma atividade só pontua quando `status = 'approved'`. Rejeitada ⇒ 0 pontos.
2. **Limite diário**: soma dos pontos de todas as atividades do usuário no dia **que não estejam
   rejeitadas** (pendentes contam, para impedir cadastro acima do limite). Ao ultrapassar, o
   INSERT é bloqueado. Um lock transacional por usuário+dia evita condição de corrida.
3. **Duplicidade**: mesma combinação `usuário + modalidade + data + horário`. Duas corridas
   no mesmo dia em horários diferentes são permitidas (o limite diário ainda se aplica).
4. **Duração mínima**: vem de `activity_categories.min_duration_minutes` (valores da especificação).
5. **Data**: não é permitido registrar atividade com data futura (fuso `America/Sao_Paulo`).
6. **Aprovação**: o *outro* participante do desafio ou um admin aprova/contesta. O dono
   nunca aprova a própria atividade (trigger). "Contestar" = rejeitar, com observação opcional.
7. **Edição**: o dono só edita atividades pendentes. Após decisão, só admin altera (e
   a alteração gera `audit_logs`).
8. **Semana**: segunda 00:00 a domingo 23:59 (`date_trunc('week')`, fuso São Paulo).
   **Mês**: dia 1 ao último dia.
9. **Ranking**: somente atividades aprovadas. Ranking "ao vivo" vem de função SQL; o
   fechamento grava uma linha imutável em `weekly_results`/`monthly_results`. Zerar o placar
   nunca apaga registros.
10. **Empate**: quando os pontos finais são iguais, ambas as linhas recebem `is_tie = true`
    e nenhuma recebe `is_winner`.
11. **Período em andamento** nunca é fechado; o fechamento só ocorre após o término do período.

## 4. Segurança (RLS + triggers + Storage)

- RLS habilitado em **todas** as tabelas de `public`.
- Funções auxiliares `security definer` com `search_path` fixo (`is_admin()`,
  `is_challenge_member()`, `shares_challenge()`) evitam recursão de políticas.
- Usuário só lê dados de desafios dos quais participa; só escreve nos próprios registros.
- Escritas de resultados, conquistas e notificações ocorrem por funções/triggers
  `security definer`, nunca por políticas abertas.
- Storage: `proofs` é privado; o caminho é `{user_id}/{uuid}.{ext}`. Leitura só para membros
  do mesmo desafio; upload só na própria pasta; tipos MIME e tamanho limitados no bucket.
- Exibição de comprovantes usa URLs assinadas de curta duração.
- Server Actions revalidam sessão (`supabase.auth.getUser()`) antes de qualquer escrita.

## 5. Fluxos principais

**Registrar atividade**: formulário → Server Action valida formato (zod) → upload do arquivo
para `proofs/{uid}/...` → `INSERT` em `activities` → trigger valida regras e calcula pontos
(`pending`) → notificação para o outro participante.

**Aprovar/contestar**: Server Action → `UPDATE activities SET status=...` → trigger valida
permissão, grava `reviewed_by/at`, `activity_approvals`, recalcula `points_awarded`,
notifica o dono, avalia conquistas.

**Fechar período** (admin pela tela, ou cron `/api/cron/close-periods` com `CRON_SECRET`):
função `close_weekly_period` / `close_monthly_period` → grava resultados, define vencedor ou
empate, concede premiação e conquista de campeão.

## 6. Tecnologias

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, componentes próprios no estilo shadcn/ui,
Lucide Icons, Recharts, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), zod 4 e Vitest 4
para as regras de domínio.

## 7. Variáveis de ambiente

Ver `.env.example`. Apenas `NEXT_PUBLIC_*` vão ao navegador. `SUPABASE_SERVICE_ROLE_KEY`
e `CRON_SECRET` são exclusivamente do servidor.

## 8. Fora do escopo desta entrega (backlog)

Itens da imagem de referência (feed de atividades, disputa em tempo real com
animações de placar, retrospectiva mensal) ficam para etapas futuras.
