-- 0007 · Assinaturas de push: só serviços de push de navegadores, limite por conta e gravação por função.

-- Serviços aceitos: FCM (Chrome/Android), Mozilla, Apple (Safari/iOS) e Windows.
create or replace function public.push_endpoint_ok(p_endpoint text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    char_length(p_endpoint) <= 1000
    and p_endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$',
    false
  );
$$;

-- Grava (ou transfere) a assinatura do aparelho para a conta logada.
-- Cada conta guarda no máximo 10 aparelhos; sai o mais antigo.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado.' using errcode = '42501';
  end if;
  if not public.push_endpoint_ok(p_endpoint) then
    raise exception 'Endereço de notificação não aceito.' using errcode = 'check_violation';
  end if;
  if char_length(p_p256dh) > 200 or char_length(p_auth) > 100 then
    raise exception 'Assinatura inválida.' using errcode = 'check_violation';
  end if;

  -- Se o aparelho já era de outra conta, passa a receber pela conta atual.
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth);

  delete from public.push_subscriptions
   where user_id = v_uid
     and id not in (
       select id from public.push_subscriptions
        where user_id = v_uid
        order by created_at desc
        limit 10
     );
end;
$$;

-- A aplicação não insere direto: só pela função acima.
drop policy if exists push_insert_own on public.push_subscriptions;

grant execute on function public.save_push_subscription(text, text, text) to app_user;
grant execute on function public.push_endpoint_ok(text) to app_user;

-- Defesa extra: a própria tabela também recusa endereços fora da lista.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_ok;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_ok check (public.push_endpoint_ok(endpoint));
