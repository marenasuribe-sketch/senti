-- ============================================================================
-- RLS (Row-Level Security) para Senti
-- ----------------------------------------------------------------------------
-- Objetivo: que cada usuario SOLO pueda ver y modificar sus propios datos.
-- Sin esto, cualquiera con la anon key (que es pública) puede leer/modificar
-- el diario, gratitudes y cápsulas de OTROS usuarios via la API REST directa.
--
-- Es idempotente: se puede correr varias veces sin romper nada.
-- Aplicar en Supabase → SQL Editor, o con `supabase db push`.
--
-- Nota: user_id está tipado como TEXT en estas tablas, por eso comparamos
-- contra auth.uid()::text.
-- ============================================================================

-- Helper para no repetir: activa RLS + policy "solo lo mío" en tablas simples.
-- (Lo hacemos explícito tabla por tabla para que quede legible y versionado.)

-- ─── gratitudes ─────────────────────────────────────────────────────────────
alter table public.gratitudes enable row level security;
drop policy if exists "gratitudes propias" on public.gratitudes;
create policy "gratitudes propias" on public.gratitudes
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── journal ────────────────────────────────────────────────────────────────
alter table public.journal enable row level security;
drop policy if exists "journal propio" on public.journal;
create policy "journal propio" on public.journal
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── plantas_usuario ────────────────────────────────────────────────────────
alter table public.plantas_usuario enable row level security;
drop policy if exists "planta propia" on public.plantas_usuario;
create policy "planta propia" on public.plantas_usuario
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── capsulas ───────────────────────────────────────────────────────────────
alter table public.capsulas enable row level security;
drop policy if exists "capsulas propias" on public.capsulas;
create policy "capsulas propias" on public.capsulas
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── logros_usuario ─────────────────────────────────────────────────────────
alter table public.logros_usuario enable row level security;
drop policy if exists "logros propios" on public.logros_usuario;
create policy "logros propios" on public.logros_usuario
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── consejos_guardados ─────────────────────────────────────────────────────
alter table public.consejos_guardados enable row level security;
drop policy if exists "consejos propios" on public.consejos_guardados;
create policy "consejos propios" on public.consejos_guardados
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- ─── perfiles (caso especial: es_premium NO lo puede tocar el usuario) ───────
-- El usuario puede leer su perfil, crearlo, y actualizar su intake — pero
-- es_premium / premium_desde / premium_hasta solo los escribe el webhook de
-- RevenueCat con service_role (que SALTA RLS y los grants de columna).
alter table public.perfiles enable row level security;

drop policy if exists "perfil propio lectura" on public.perfiles;
create policy "perfil propio lectura" on public.perfiles
  for select using (auth.uid()::text = user_id);

drop policy if exists "perfil propio insertar" on public.perfiles;
create policy "perfil propio insertar" on public.perfiles
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "perfil propio actualizar" on public.perfiles;
create policy "perfil propio actualizar" on public.perfiles
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Defensa real contra auto-asignarse premium: privilegios a nivel de columna.
-- Al rol `authenticated` (usuarios logueados desde la app) le quitamos UPDATE
-- sobre toda la tabla y se lo devolvemos SOLO en las columnas no sensibles.
-- service_role no se ve afectado: ignora estos grants y RLS por completo.
revoke update on public.perfiles from authenticated;
grant  update (intake) on public.perfiles to authenticated;
-- Si agregas más columnas editables por el usuario, añádelas arriba.

-- ============================================================================
-- Verificación rápida (opcional): listar el estado de RLS por tabla
--   select relname, relrowsecurity from pg_class
--   where relname in ('gratitudes','journal','plantas_usuario','capsulas',
--                     'logros_usuario','consejos_guardados','perfiles');
-- relrowsecurity debe ser true en todas.
-- ============================================================================
