/**
 * Lógica compartida de la planta:
 * - constantes (gotas por etapa, max etapas, emoji por etapa)
 * - helpers (etapa actual, emoji actual, label)
 * - sumarGotas(): suma puntos en Supabase y devuelve si subió de etapa
 *   (para disparar el modal de celebración en cada acción)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// 90 gotas por etapa × 5 etapas = 450 gotas para completar la planta.
// Con 1 acción/día (~2-3 gotas) → ~5-6 meses. Con 2 acc/día → ~3 meses.
// Decisión de producto: la planta es la zanahoria que justifica suscripción
// prolongada. Cada celebración debe sentirse como un evento real, no diario.
export const GOTAS_POR_ETAPA = 90;
export const MAX_ETAPAS = 5;

export const PLANTAS_INFO: Record<string, { emoji: string; nombre: string; glow: string; accent: string }> = {
  // Plantas gratuitas
  bambu:    { emoji: '🎋', nombre: 'Bambú',    glow: '#bfefbd', accent: '#3d6841' },
  girasol:  { emoji: '🌻', nombre: 'Girasol',  glow: '#fef3e2', accent: '#8a5010' },
  lavanda:  { emoji: '🪻', nombre: 'Lavanda',  glow: '#f0ebf8', accent: '#5a4a8a' },
  cactus:   { emoji: '🌵', nombre: 'Cactus',   glow: '#e8f4ec', accent: '#3d6841' },
  helecho:  { emoji: '🌿', nombre: 'Helecho',  glow: '#e6f0e6', accent: '#3a6030' },
  // Plantas Senti+
  rosal:       { emoji: '🌹', nombre: 'Rosal',       glow: '#fce4ec', accent: '#c2185b' },
  cedro:       { emoji: '🌲', nombre: 'Cedro',       glow: '#dcedc8', accent: '#2e7d32' },
  magnolia:    { emoji: '🌸', nombre: 'Magnolia',    glow: '#f8bbd0', accent: '#ad1457' },
  orquidea:    { emoji: '🪷', nombre: 'Orquídea',    glow: '#f3e5f5', accent: '#7b1fa2' },
  tulipan:     { emoji: '🌷', nombre: 'Tulipán',     glow: '#ffeef2', accent: '#c62828' },
  peonia:      { emoji: '🌺', nombre: 'Peonía',      glow: '#fce4ec', accent: '#880e4f' },
  dalia:       { emoji: '🌼', nombre: 'Dalia',       glow: '#fffde7', accent: '#f57f17' },
  palma:       { emoji: '🌴', nombre: 'Palma',       glow: '#e0f7fa', accent: '#00695c' },
  nomeolvides: { emoji: '💐', nombre: 'Nomeolvides', glow: '#e8eaf6', accent: '#3949ab' },
  trebol:      { emoji: '🍀', nombre: 'Trébol',      glow: '#e8f5e9', accent: '#1b5e20' },
  coral:       { emoji: '🪸', nombre: 'Coral',       glow: '#fff3e0', accent: '#bf360c' },
  trigo:       { emoji: '🌾', nombre: 'Trigo',       glow: '#fff8e1', accent: '#e65100' },
  sabila:      { emoji: '🌱', nombre: 'Sábila',      glow: '#e8f5e9', accent: '#2e7d32' },
};

export const PLANTAS_PREMIUM = new Set([
  'rosal', 'cedro', 'magnolia',
  'orquidea', 'tulipan', 'peonia', 'dalia', 'palma',
  'nomeolvides', 'trebol', 'coral', 'trigo', 'sabila',
]);

// Hemisferio Sur (Chile) — diciembre/enero/febrero = verano
export type Estacion = 'primavera' | 'verano' | 'otoño' | 'invierno';
export type EstacionInfo = {
  nombre: string;
  emoji: string;
  glowExtra: string; // color de brillo suplementario
  mensaje: string;
};

export const ESTACIONES: Record<Estacion, EstacionInfo> = {
  primavera: { nombre: 'Primavera', emoji: '🌸', glowExtra: '#fce4ec', mensaje: 'Todo florece, incluso lo que parecía dormido.' },
  verano:    { nombre: 'Verano',    emoji: '☀️', glowExtra: '#fff9c4', mensaje: 'Llevas la luz del verano contigo donde vayas.' },
  otoño:     { nombre: 'Otoño',     emoji: '🍂', glowExtra: '#ffe0b2', mensaje: 'Soltar también es un acto de valentía.' },
  invierno:  { nombre: 'Invierno',  emoji: '❄️', glowExtra: '#e3f2fd', mensaje: 'La quietud del invierno también es crecimiento.' },
};

export function obtenerEstacion(): Estacion {
  const mes = new Date().getMonth() + 1; // 1-12
  // Hemisferio Sur: primavera sep-nov, verano dic-feb, otoño mar-may, invierno jun-ago
  if (mes >= 9 && mes <= 11) return 'primavera';
  if (mes === 12 || mes <= 2) return 'verano';
  if (mes >= 3 && mes <= 5)  return 'otoño';
  return 'invierno';
}

// Las primeras 4 etapas son universales (semilla → brote → raíces → florecer).
// La 5ª revela el emoji de la planta elegida por la usuaria.
export const ETAPA_EMOJI = ['🌰', '🌱', '🪴', '🌸'];
export const ETAPA_LABEL = ['SEMILLA', 'BROTE', 'ENRAIZANDO', 'FLORECIENDO', 'EN PLENITUD'];

export function etapaPara(gotas: number): number {
  return Math.min(Math.floor(gotas / GOTAS_POR_ETAPA) + 1, MAX_ETAPAS);
}

export function emojiEtapa(etapa: number, plantaId: string | null): string {
  if (etapa < MAX_ETAPAS) return ETAPA_EMOJI[etapa - 1];
  return plantaId ? PLANTAS_INFO[plantaId]?.emoji ?? '🌱' : '🌱';
}

export function labelEtapa(etapa: number): string {
  return ETAPA_LABEL[etapa - 1] ?? '';
}

export type SumarGotasResult = {
  etapaAntes: number;
  etapaDespues: number;
  subio: boolean;
  plantaId: string | null;
};

/**
 * Suma N gotas al puntaje de la planta del usuario.
 * Devuelve etapa antes/después y si subió — útil para mostrar celebración.
 *
 * Si el usuario aún no tiene planta (caso raro), no hace nada y devuelve subio=false.
 */
export async function sumarGotas(
  supabase: SupabaseClient,
  userId: string,
  cantidad: number,
): Promise<SumarGotasResult> {
  if (cantidad <= 0) return { etapaAntes: 1, etapaDespues: 1, subio: false, plantaId: null };

  const { data: planta } = await supabase
    .from('plantas_usuario')
    .select('puntos, nombre')
    .eq('user_id', userId)
    .single();

  if (!planta) {
    return { etapaAntes: 1, etapaDespues: 1, subio: false, plantaId: null };
  }

  const puntosAntes   = planta.puntos ?? 0;
  const puntosDespues = puntosAntes + cantidad;
  const etapaAntes    = etapaPara(puntosAntes);
  const etapaDespues  = etapaPara(puntosDespues);

  const { error: updateError } = await supabase
    .from('plantas_usuario')
    .update({ puntos: puntosDespues })
    .eq('user_id', userId);

  if (updateError) {
    return { etapaAntes, etapaDespues: etapaAntes, subio: false, plantaId: planta.nombre ?? null };
  }

  return {
    etapaAntes,
    etapaDespues,
    subio: etapaDespues > etapaAntes,
    plantaId: planta.nombre ?? null,
  };
}
