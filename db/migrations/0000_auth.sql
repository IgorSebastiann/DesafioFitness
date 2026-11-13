-- 0000 · Autenticação (tabelas do Better Auth) e papel de aplicação para o RLS.
-- Execute como dono do banco (Neon). As tabelas seguem o schema de better-auth 1.7.x
-- com os nomes configurados em src/lib/auth.ts.

create extension if not exists pgcrypto;

create table public.users (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  "emailVerified" boolean not null default false,
  image           text,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);

create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token       text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    uuid not null references public.users (id) on delete cascade
);

create table public.accounts (
  id                       uuid primary key default gen_random_uuid(),
  "accountId"              text not null,
  "providerId"             text not null,
  "userId"                 uuid not null references public.users (id) on delete cascade,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamptz,
  "refreshTokenExpiresAt"  timestamptz,
  scope                    text,
  password                 text,
  "createdAt"              timestamptz not null default now(),
  "updatedAt"              timestamptz not null default now()
);

create table public.verifications (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,
  value       text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index sessions_user_idx on public.sessions ("userId");
create index accounts_user_idx on public.accounts ("userId");

-- Papel usado pela aplicação. Não é dono das tabelas e não tem BYPASSRLS,
-- então as políticas de RLS sempre se aplicam.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;

-- Permite que o dono do banco (conexão da aplicação) assuma o papel app_user.
do $$
begin
  execute format('grant app_user to %I', current_user);
end
$$;

-- Usuário autenticado da transação atual (definido por withUser em src/lib/db.ts).
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
