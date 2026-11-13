-- 0005 · Permissões do papel app_user sobre tabelas, sequências e funções.
-- O RLS restringe as linhas; estes GRANTs apenas permitem que o papel alcance as tabelas.

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema public to app_user;

alter default privileges in schema public grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public grant usage, select on sequences to app_user;
alter default privileges in schema public grant execute on functions to app_user;

-- Auth do Better Auth é acessado pela própria aplicação como dono; não precisa de RLS para app_user.
revoke all on public.users, public.sessions, public.accounts, public.verifications from app_user;
grant select, insert, update, delete on public.users, public.sessions, public.accounts, public.verifications to app_user;
