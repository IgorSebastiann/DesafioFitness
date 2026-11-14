# Continuar o Desafio Fitness

Guia de retomada: o que está no ar, o que falta e como trabalhar a partir de outra máquina.
Para instalação e configuração completas, veja o `README.md`.

## 1. Estado atual

- **Produção**: https://desafio-fitness-brown.vercel.app (deploy automático a cada push na `main`).
- **Repositório**: https://github.com/IgorSebastiann/DesafioFitness (privado). Última versão na `main`: commit `ebb5d2e`.
- **Banco**: Neon Postgres, criado pela integração Neon da Vercel (`neon-charcoal-queen`). As migrations 0000 a 0007 e o seed já estão aplicados.
- **Armazenamento de fotos e comprovações**: Vercel Blob privado (store `desafio-fitness-proofs`).
- **Autenticação**: Better Auth (e-mail e senha).
- **Testes**: 75 passando (30 de regras de domínio e 45 de regras do banco contra PostgreSQL). Rode `npm test`.

### Já implementado

- Criar conta, entrar e sair. Recuperação de senha existe, mas o e-mail só sai com o Resend (ver pendências).
- Qualquer pessoa cria o próprio desafio e entra automaticamente (um desafio por pessoa).
- Convite por link para o parceiro: vale 7 dias, só é aceito pelo e-mail convidado e o desafio tem no máximo 2 pessoas.
- Registro de atividade com comprovação em foto ou vídeo, com captura pela câmera. Fotos viram JPEG antes do envio (comprovação 1280 px, perfil 512 px).
- Aprovar ou contestar atividade do parceiro. Pontuação, limite diário, duplicidade e duração mínima são validados no banco.
- Placar semanal e mensal, ranking, histórico de períodos fechados, calendário, conquistas e premiações.
- Notificações no app e push (Web Push) para Android e iPhone instalado na tela de início.
- Área de administração global (modalidades, papéis, correções auditadas). Não é necessária para usar o app.

## 2. Pendências, em ordem de prioridade

1. **E-mail de recuperação de senha (Resend)**. Sem ele, o link de recuperação só aparece no log do servidor.
   - Instalar a integração: `vercel integration add resend/resend-email --no-claim --non-interactive`. Ela pede a aceitação dos termos no navegador (link que a CLI imprime).
   - Criar a chave de API no Resend e cadastrar `RESEND_API_KEY` na Vercel (produção, preview e development). `EMAIL_FROM` também pode ser definido.
   - Limite: sem domínio verificado, o Resend só entrega ao e-mail da própria conta Resend. Para enviar a qualquer pessoa é preciso um domínio próprio verificado.
   - Alternativas: outro provedor pelo Marketplace (Postmark, SendGrid) ou trocar a autenticação para o Neon Auth.
2. **Confirmar login e cadastro no navegador**. As correções de mensagens de erro e de origens confiáveis foram publicadas no commit `ebb5d2e`, mas o login da sua conta ainda não foi confirmado.
3. **Fechamento automático dos períodos**. A rota `GET /api/cron/close-periods` existe e é protegida por `CRON_SECRET`, mas não está agendada. Falta um `vercel.json` com `crons`. No plano gratuito o cron roda no máximo uma vez por dia.
4. **Testar push em aparelho real**. Android: abrir o site, tocar em Ativar e enviar o aviso de teste pela tela Notificações. iPhone: adicionar à tela de início (Safari, Compartilhar, Adicionar à Tela de Início), abrir pelo ícone e tocar em Ativar. Não há como testar push a partir do computador.
5. **Testar o convite completo com duas contas**: criar o desafio com a conta A, convidar o e-mail da conta B, entrar com a B e aceitar.
6. **Vídeos** não são convertidos. O limite é 50 MB. Se o espaço virar problema, vale comprimir ou limitar a duração.

## 3. Decisões tomadas (não mudar sem conversar)

- Desafio é de quem participa; admin só cuida de modalidades, papéis e auditoria.
- Limite de 2 participantes e 1 desafio por pessoa.
- Convite: um pendente por desafio, válido por 7 dias, aceito só pelo e-mail convidado.
- Regra de pontos: 1 ponto por atividade aprovada, limite diário de 2 pontos. Pendentes contam para o limite; rejeitadas não contam.
- Duplicidade: mesma pessoa, modalidade, data e horário. Duas corridas no mesmo dia em horários diferentes são aceitas.
- Semana de segunda a domingo; mês do dia 1 ao último dia; fuso America/Sao_Paulo.
- Push: só aceita endereços dos serviços de push dos navegadores (FCM, Mozilla, Apple e Windows); no máximo 10 aparelhos por conta.
- Fotos em JPEG (não WebP), porque o Safari do iPhone não codifica WebP no canvas.
- O banco não guarda imagens; só o caminho no Blob.
- Projeto de referência: o repositório `ReservaQuadras` (Supabase) serviu de modelo para o push, a conversão de imagem e a câmera. O código foi adaptado, não copiado.

## 4. Infra e variáveis (nomes, não valores)

Variáveis na Vercel (todos os ambientes, exceto onde indicado):

- `DATABASE_URL` (Neon, já injetada pela integração), `DATABASE_URL_UNPOOLED` e as `POSTGRES_*`.
- `BETTER_AUTH_SECRET`, `CRON_SECRET`.
- `NEXT_PUBLIC_SITE_URL` (produção e preview: `https://desafio-fitness-brown.vercel.app`).
- `BLOB_READ_WRITE_TOKEN` (injetada pelo store de Blob).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secreta), `VAPID_SUBJECT` (`https://desafio-fitness-brown.vercel.app`).
- Pendentes: `RESEND_API_KEY`, `EMAIL_FROM`.

Valores secretos não estão no repositório. Para usar a mesma configuração em outra máquina, veja a seção 5.

Outros itens:

- Projeto na Vercel: `desafio-fitness` (time `igorsebastian23-4087s-projects`), conectado ao GitHub.
- A Vercel criou um "Protection Bypass for Automation secret" no projeto ao usar o `vercel curl`. Pode ser revogado em Deployment Protection.
- A instalação do Supabase no Marketplace ficou pendente e nada foi criado no Supabase. Pode ser cancelada na Vercel.

## 5. Trabalhar em outra máquina

```bash
git clone https://github.com/IgorSebastiann/DesafioFitness.git
cd DesafioFitness
npm install
npm install -g vercel            # se ainda não tiver a CLI
vercel login                     # conta igorsebastian23-4087
vercel link                      # escolher o projeto desafio-fitness
vercel env pull .env.local --yes # traz as variáveis (inclui segredos)
npm test
npm run dev                      # http://localhost:3000
```

O `.env.local` não vai para o Git de propósito: ele tem segredos. Por isso o `vercel env pull` é o caminho certo para trazê-lo.

## 6. Comandos úteis

```bash
npm test                  # testes de domínio e do banco
npm run typecheck         # tsc --noEmit
npm run lint
npm run build
npm run db:migrate        # aplica migrations novas em db/migrations (usa .env.local)
```

Publicar: `git push origin main` dispara o deploy na Vercel. Também é possível rodar `vercel deploy --prod --yes`.

## 7. Onde fica cada coisa

- `src/app/(app)/`: telas logadas (painel, atividades, desafio, ranking, calendário, premiações, conquistas, perfil, notificações, admin).
- `src/app/(auth)/` e `src/app/convite/[token]/`: login, cadastro, recuperação de senha e página de convite.
- `src/app/actions/`: Server Actions (auth, atividades, desafio, perfil, push, admin, notificações).
- `src/app/api/`: autenticação (Better Auth), upload para o Blob, comprovações e fotos, cron.
- `src/lib/db.ts`: pool e `withUser`, que roda cada consulta como o papel `app_user` (o RLS vale de verdade).
- `src/lib/auth.ts`: configuração do Better Auth (origens confiáveis, limites de tentativa, recuperação).
- `src/lib/push.ts` e `src/lib/push-client.ts`: envio e ativação de push.
- `src/lib/image.ts`: conversão de fotos para JPEG.
- `src/lib/domain/`: regras puras, com testes.
- `db/migrations/`: schema, regras, RLS, fechamento de período, grants, desafio e convites, push. A ordem é importante.
- `tests/db/`: testes das regras no PostgreSQL (PGlite).
- `docs/ARQUITETURA.md`: arquitetura e decisões de regra de negócio (a parte de infraestrutura está desatualizada; o que vale é este arquivo e o README).

## 8. Como retomar da última parada

1. Resolver a pendência 1 (Resend). Próximo passo concreto: aceitar os termos pelo link da CLI e me passar a chave da API para eu cadastrar na Vercel.
2. Confirmar login e cadastro no navegador (pendência 2).
3. Decidir o agendamento do cron (pendência 3).
4. Testar push no celular (pendência 4).
