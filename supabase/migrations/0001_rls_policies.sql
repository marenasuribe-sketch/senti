-- ============================================================================
-- RLS (Row-Level Security) para Senti — RESET LIMPIO
-- ----------------------------------------------------------------------------
-- Objetivo: que cada usuario SOLO pueda ver y modificar sus propios datos.
--
-- Por qué un "reset": el proyecto tenía policies mezcladas, incluyendo
-- policies "acceso_total" (using true / check true) en gratitudes, journal y
-- plantas_usuario que ANULABAN la protección — cualquiera podía ver datos de
-- otros usuarios. Postgres combina policies con OR, así que una sola policy
-- "true" deja pasar todo aunque haya otra que filtre por user_id.
--
-- Este script borra TODAS las policies de cada tabla y crea un set único y
-- correcto. Es idempotente: se puede correr varias veces sin romper nada.
--
-- Aplicar en Supabase → SQL Editor → pegar todo → Run.
--
-- Nota: user_id es TEXT en estas tablas, por eso comparamos auth.uid()::text.
-- ============================================================================

-- 1. Borrar TODAS las policies existentes de las 7 tablas (limpia duplicados
--    y la peligrosa "acceso_total").
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'gratitudes', 'journal', 'plantas_usuario', 'capsulas',
        'logros_usuario', 'consejos_guardados', 'perfiles'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2. Asegurar RLS activado en todas.
alter table public.gratitudes        enable row level security;
alter table public.journal           enable row level security;
alter table public.plantas_usuario   enable row level security;
alter table public.capsulas          enable row level security;
alter table public.logros_usuario    enable row level security;
alter table public.consejos_guardados enable row level security;
alter table public.perfiles          enable row level security;

-- 3. Policies "solo lo mío" (una por tabla, cubre SELECT/INSERT/UPDATE/DELETE).
--    Casteamos AMBOS lados a text porque user_id es uuid en unas tablas
--    (perfiles, capsulas) y text en otras (journal, gratitudes).
create policy "gratitudes propias" on public.gratitudes
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

create policy "journal propio" on public.journal
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

create policy "planta propia" on public.plantas_usuario
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

create policy "capsulas propias" on public.capsulas
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

create policy "logros propios" on public.logros_usuario
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

create policy "consejos propios" on public.consejos_guardados
  for all using ((auth.uid())::text = (user_id)::text) with check ((auth.uid())::text = (user_id)::text);

-- 4. perfiles: el usuario lee y crea SU perfil, pero NO lo actualiza.
--    Todas las columnas editables (es_premium, premium_desde, premium_hasta)
--    solo las escribe el webhook de RevenueCat con service_role.
create policy "perfil propio lectura" on public.perfiles
  for select using ((auth.uid())::text = (user_id)::text);

create policy "perfil propio insertar" on public.perfiles
  for insert with check ((auth.uid())::text = (user_id)::text);

-- 5. Blindaje contra auto-asignarse premium: el usuario no puede UPDATE perfiles.
--    (No hay ninguna columna que deba poder editar — todas son del webhook.)
--    service_role ignora este revoke y sigue pudiendo actualizar es_premium.
revoke update on public.perfiles from authenticated;

-- ============================================================================
-- Verificación (correr después): no debe quedar ninguna policy con qual='true'
--   select tablename, policyname, qual, with_check from pg_policies
--   where schemaname='public' and (qual = 'true' or with_check = 'true');
-- Debe devolver 0 filas.
-- ============================================================================
