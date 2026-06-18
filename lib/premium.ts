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
    analisisIA_porMes: 1,
    audios_porDia: 1,
    capsulas: 1,           // máximo 1 cápsula activa total
    plantas: 1,            // solo 1 planta simultánea
    modeloIA: 'claude-haiku-4-5-20251001' as const,
  },
  premium: {
    analisisIA_porDia: 4,
    audios_porDia: 10,
    capsulas: 6,           // hasta 6 cápsulas activas
    plantas: 3,            // hasta 3 plantas simultáneas
    modeloIA: 'claude-sonnet-4-6' as const,
  },
} as const;

// ─── Precios para mostrar en pantalla ─────────────────────────────────────────

export const PRECIOS = {
  mensual_usd: 4.99,
  anual_usd: 39.99,
  earlyAdopter_clp: 25000,   // precio bloqueado de por vida — primeras 500 personas
  earlyAdopter_cupos: 500,
} as const;
