/**
 * Sistema de premium de Senti.
 *
 * Por ahora usa el campo `es_premium` en la tabla `perfiles` de Supabase.
 * Se activa manualmente desde el dashboard para testing.
 *
 * Cuando se integre RevenueCat, solo hay que actualizar esta tabla
 * via webhook — el resto de la app no cambia nada.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Inicio del mes actual en UTC */
function inicioMesActual(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Cuenta el total de entradas del mes actual en todas las pantallas
 * (journal + diario + descargas se guardan en 'journal'; gratitudes en 'gratitudes').
 */
export async function contarEntradasMes(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const desde = inicioMesActual();
  const [{ count: j }, { count: g }] = await Promise.all([
    supabase.from('journal').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', desde),
    supabase.from('gratitudes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', desde),
  ]);
  return (j ?? 0) + (g ?? 0);
}

/**
 * Cuenta transcripciones de audio del mes (para límite premium de ~40 min).
 * Asume ~2 min por audio → 20 transcripciones ≈ 40 min.
 */
export async function contarAudiosMes(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('journal')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('via_audio', true)
    .gte('created_at', inicioMesActual());
  return count ?? 0;
}

export type Perfil = {
  es_premium: boolean;
  premium_desde: string | null;
  premium_hasta: string | null;
};

/**
 * Obtiene el perfil del usuario (crea uno si no existe).
 * Cacheable — llámala al iniciar sesión y guarda el resultado.
 */
export async function obtenerPerfil(
  supabase: SupabaseClient,
  userId: string,
): Promise<Perfil> {
  const { data } = await supabase
    .from('perfiles')
    .select('es_premium, premium_desde, premium_hasta')
    .eq('user_id', userId)
    .maybeSingle();

  // Si no existe el perfil todavía, lo crea con plan gratuito
  if (!data) {
    await supabase.from('perfiles').insert({ user_id: userId });
    return { es_premium: false, premium_desde: null, premium_hasta: null };
  }

  // Si la suscripción expiró, tratarla como gratuita (aunque la BD diga es_premium=true)
  if (data.premium_hasta && new Date(data.premium_hasta) < new Date()) {
    return { es_premium: false, premium_desde: data.premium_desde, premium_hasta: data.premium_hasta };
  }

  return data as Perfil;
}

/**
 * Devuelve true si el usuario tiene Senti+ activo.
 * Versión rápida — solo boolean.
 */
export async function esPremium(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const perfil = await obtenerPerfil(supabase, userId);
  return perfil.es_premium;
}

// ─── Límites por plan ─────────────────────────────────────────────────────────

export const LIMITES = {
  gratis: {
    entradas_porMes: 5,    // total: journal + gratitud + descarga combinados
    audios_porMes: 0,      // sin audio
    capsulas: 1,
    plantas: 1,
    modeloIA: 'claude-haiku-4-5-20251001' as const,
  },
  premium: {
    entradas_porMes: 30,   // total combinado (~1 por día)
    audios_porMes: 20,     // ~40 min si cada audio dura ~2 min
    capsulas: 6,
    plantas: 3,
    modeloIA: 'claude-sonnet-4-6' as const,
  },
} as const;

// ─── Precios para mostrar en pantalla ─────────────────────────────────────────

export const PRECIOS = {
  mensual_usd: 2.95,
  anual_usd: 15.95,
} as const;
