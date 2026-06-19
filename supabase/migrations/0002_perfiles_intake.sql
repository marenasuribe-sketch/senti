-- ============================================================================
-- Arregla el guardado del intake del onboarding.
-- ----------------------------------------------------------------------------
-- El código (app/onboarding/intake.tsx) guarda las 5 respuestas del intake en
-- perfiles.intake, pero esa columna no existía → se perdían (solo quedaban en
-- AsyncStorage local). Esto agrega la columna y permite al usuario escribir
-- SOLO esa columna (el UPDATE general sigue revocado para blindar es_premium).
--
-- Aplicar en Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.perfiles add column if not exists intake jsonb;

-- El rol authenticated tiene UPDATE revocado en perfiles (ver 0001). Le damos
-- de vuelta solo la columna intake, para que el onboarding pueda guardarla.
grant update (intake) on public.perfiles to authenticated;
