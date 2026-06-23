/**
 * Sistema de logros emocionales de Senti.
 *
 * 18 logros en 6 categorías. Cada logro aparece como modal suave
 * (card verde #BFEFBD) justo después de la acción que lo activa.
 * Sin confeti, sin sonido — solo el nombre, la frase y un botón.
 *
 * Los logros ya desbloqueados se guardan en `logros_usuario` en Supabase
 * (un registro por logro, UNIQUE por user_id + logro_id → no se repiten).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LogroId =
  // Hitos de inicio
  | 'primera_gota'
  | 'tres_anclajes'
  | 'primera_descarga'
  // Permitirte sentir
  | 'nombre_tristeza'
  | 'rabia_informacion'
  | 'aceptaste_no_saber'
  | 'volviste_semana_dificil'
  // Constancia amable
  | 'siete_dias'
  | 'volviste'
  | 'treinta_dias'
  | 'cien_dias'
  // Soltar y agradecer
  | 'guardiana_silencio'
  | 'corazon_agradecido'
  | 'buscadora_luz'
  // Tu voz
  | 'tu_voz'
  | 'palabras_sin_palabras'
  // Tu planta
  | 'primera_semilla'
  | 'vida_completa';

export type Logro = {
  id: LogroId;
  nombre: string;
  mensaje: string;
  icono: string;
  categoria: 'inicio' | 'sentir' | 'constancia' | 'soltar' | 'voz' | 'planta';
};

// ─── Definición de los 18 logros ─────────────────────────────────────────────

export const LOGROS: Record<LogroId, Logro> = {
  primera_gota: {
    id: 'primera_gota',
    nombre: 'Tu primera gota',
    mensaje: 'Empezaste. Eso ya es algo.',
    icono: 'water-outline',
    categoria: 'inicio',
  },
  tres_anclajes: {
    id: 'tres_anclajes',
    nombre: 'Tres anclajes',
    mensaje: 'Hoy elegiste mirar lo que sí estuvo.',
    icono: 'heart-outline',
    categoria: 'inicio',
  },
  primera_descarga: {
    id: 'primera_descarga',
    nombre: 'Tu primera descarga',
    mensaje: 'Soltaste algo que no necesitabas seguir cargando.',
    icono: 'leaf-outline',
    categoria: 'inicio',
  },
  nombre_tristeza: {
    id: 'nombre_tristeza',
    nombre: 'Le diste nombre a la tristeza',
    mensaje: 'Reconocer lo que sientes es el primer cuidado.',
    icono: 'cloud-outline',
    categoria: 'sentir',
  },
  rabia_informacion: {
    id: 'rabia_informacion',
    nombre: 'La rabia también es información',
    mensaje: 'Tu rabia te está mostrando algo. Escucharla es valiente.',
    icono: 'flash-outline',
    categoria: 'sentir',
  },
  aceptaste_no_saber: {
    id: 'aceptaste_no_saber',
    nombre: 'Aceptaste no saber',
    mensaje: 'No tener claridad también es información honesta.',
    icono: 'help-circle-outline',
    categoria: 'sentir',
  },
  volviste_semana_dificil: {
    id: 'volviste_semana_dificil',
    nombre: 'Volviste de una semana difícil',
    mensaje: 'Pasaste por algo pesado. Y volviste. Eso cuenta.',
    icono: 'sunny-outline',
    categoria: 'sentir',
  },
  siete_dias: {
    id: 'siete_dias',
    nombre: 'Te elegiste 7 días',
    mensaje: 'Una semana eligiendo pausar para ti.',
    icono: 'calendar-outline',
    categoria: 'constancia',
  },
  volviste: {
    id: 'volviste',
    nombre: 'Volviste',
    mensaje: 'No es necesario hacerlo perfecto. Solo volver.',
    icono: 'arrow-undo-outline',
    categoria: 'constancia',
  },
  treinta_dias: {
    id: 'treinta_dias',
    nombre: 'Te elegiste un mes',
    mensaje: 'Un mes completo dándote este espacio.',
    icono: 'moon-outline',
    categoria: 'constancia',
  },
  cien_dias: {
    id: 'cien_dias',
    nombre: 'Aquí, contigo',
    mensaje: 'Cien días de bajar el ruido. De volver a ti.',
    icono: 'infinite-outline',
    categoria: 'constancia',
  },
  guardiana_silencio: {
    id: 'guardiana_silencio',
    nombre: 'Guardiana del silencio',
    mensaje: 'Sabes que vaciar también es avanzar.',
    icono: 'leaf-outline',
    categoria: 'soltar',
  },
  corazon_agradecido: {
    id: 'corazon_agradecido',
    nombre: 'Corazón agradecido',
    mensaje: 'Treinta veces elegiste mirar lo que sostiene.',
    icono: 'heart-outline',
    categoria: 'soltar',
  },
  buscadora_luz: {
    id: 'buscadora_luz',
    nombre: 'Buscadora de luz',
    mensaje: 'Encontraste cien razones, una a una.',
    icono: 'sunny-outline',
    categoria: 'soltar',
  },
  tu_voz: {
    id: 'tu_voz',
    nombre: 'Tu voz contó algo',
    mensaje: 'Hablar también es ordenar por dentro.',
    icono: 'mic-outline',
    categoria: 'voz',
  },
  palabras_sin_palabras: {
    id: 'palabras_sin_palabras',
    nombre: 'Le diste palabras a lo que no las tenía',
    mensaje: 'A veces no hay frase. Pero tu voz alcanza.',
    icono: 'mic-outline',
    categoria: 'voz',
  },
  primera_semilla: {
    id: 'primera_semilla',
    nombre: 'Tu primera semilla',
    mensaje: 'Algo está empezando a echar raíces.',
    icono: 'flower-outline',
    categoria: 'planta',
  },
  vida_completa: {
    id: 'vida_completa',
    nombre: 'Una vida completa',
    mensaje: 'Tu primera planta floreció. Va al jardín.',
    icono: 'sparkles-outline',
    categoria: 'planta',
  },
};

// ─── Tipo de acción ───────────────────────────────────────────────────────────

export type AccionLogro = {
  tipo: 'journal' | 'gratitud' | 'descarga';
  estres?: number;
  tresAnclajes?: boolean;
  tags?: string[];
  viaAudio?: boolean;
};

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Verifica qué logros se acaban de desbloquear tras una acción.
 *
 * Optimizado para velocidad:
 * - Queries independientes en paralelo (1 ronda de red en vez de 9 secuenciales)
 * - Límite de 100 días para el conteo de días únicos (evita full-scan)
 * - Queries de gratitudes comparten resultado para corazon_agradecido + buscadora_luz
 * - Queries de historial comparten resultado para volviste + volviste_semana_dificil
 * - Solo lanza queries para logros aún no desbloqueados
 */
export async function verificarLogros(
  supabase: SupabaseClient,
  userId: string,
  accion: AccionLogro,
): Promise<Logro[]> {
  // Primera query: logros ya desbloqueados
  const { data: yaDesbloqueados } = await supabase
    .from('logros_usuario')
    .select('logro_id')
    .eq('user_id', userId);

  const desbloqueados = new Set((yaDesbloqueados ?? []).map(l => l.logro_id as LogroId));
  const tiene = (id: LogroId) => desbloqueados.has(id);

  // ── Logros inmediatos (sin queries extra) ─────────────────────────────────
  const nuevos: LogroId[] = [];
  if (!tiene('primera_gota'))        nuevos.push('primera_gota');
  if (!tiene('tres_anclajes')    && accion.tipo === 'gratitud' && accion.tresAnclajes)  nuevos.push('tres_anclajes');
  if (!tiene('primera_descarga') && accion.tipo === 'descarga')                         nuevos.push('primera_descarga');
  if (!tiene('nombre_tristeza')  && accion.tipo === 'journal' && (accion.estres ?? 0) > 65) nuevos.push('nombre_tristeza');
  if (!tiene('aceptaste_no_saber') && accion.tipo === 'descarga' && accion.tags?.includes('otro')) nuevos.push('aceptaste_no_saber');
  if (!tiene('tu_voz') && accion.viaAudio) nuevos.push('tu_voz');

  // ── Determinar qué queries necesitamos ───────────────────────────────────
  const esNueva            = nuevos.includes('primera_gota');
  const necesitaDias       = !tiene('siete_dias') || !tiene('treinta_dias') || !tiene('cien_dias');
  const necesitaHistorial  = (!tiene('volviste') && !esNueva) || !tiene('volviste_semana_dificil');
  const necesitaSemana     = !tiene('volviste_semana_dificil');
  const necesitaRabia      = !tiene('rabia_informacion') && accion.tipo === 'descarga' && (accion.tags?.includes('enojo') ?? false);
  const necesitaGuardiana  = !tiene('guardiana_silencio') && accion.tipo === 'descarga';
  const necesitaGratitudes = accion.tipo === 'gratitud' && (!tiene('corazon_agradecido') || !tiene('buscadora_luz'));
  const necesitaAudio      = !tiene('palabras_sin_palabras') && (accion.viaAudio ?? false);
  const necesitaPlanta     = !tiene('primera_semilla') || !tiene('vida_completa');

  // Límite de 100 días para el conteo de días únicos
  const hace100dias = new Date();
  hace100dias.setDate(hace100dias.getDate() - 100);
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  const noop = Promise.resolve({ data: null, count: null, error: null });

  // ── Todas las queries en paralelo ─────────────────────────────────────────
  const [
    rJournalDias,
    rGratitudDias,
    rHistorial,
    rSemana,
    rRabia,
    rGuardiana,
    rGratitudes,
    rAudio,
    rPlanta,
  ] = await Promise.all([
    necesitaDias
      ? supabase.from('journal').select('created_at').eq('user_id', userId).gte('created_at', hace100dias.toISOString())
      : noop,
    necesitaDias
      ? supabase.from('gratitudes').select('created_at').eq('user_id', userId).gte('created_at', hace100dias.toISOString())
      : noop,
    necesitaHistorial
      ? supabase.from('journal').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      : noop,
    necesitaSemana
      ? supabase.from('journal').select('created_at, estres').eq('user_id', userId).gte('created_at', hace7dias.toISOString()).not('estres', 'is', null)
      : noop,
    necesitaRabia
      ? supabase.from('journal').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('es_descarga', true).contains('tags', ['enojo'])
      : noop,
    necesitaGuardiana
      ? supabase.from('journal').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('es_descarga', true)
      : noop,
    necesitaGratitudes
      ? supabase.from('gratitudes').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      : noop,
    necesitaAudio
      ? supabase.from('journal').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('via_audio', true)
      : noop,
    necesitaPlanta
      ? supabase.from('plantas_usuario').select('puntos').eq('user_id', userId).maybeSingle()
      : noop,
  ]);

  // ── Procesar resultados ───────────────────────────────────────────────────

  // Días únicos acumulados (últimos 100 días)
  if (necesitaDias) {
    const diasUnicos = new Set([
      ...(rJournalDias.data ?? []).map((e: any) => new Date(e.created_at).toDateString()),
      ...(rGratitudDias.data ?? []).map((e: any) => new Date(e.created_at).toDateString()),
    ]);
    const total = diasUnicos.size;
    if (!tiene('siete_dias')  && total >= 7)   nuevos.push('siete_dias');
    if (!tiene('treinta_dias') && total >= 30)  nuevos.push('treinta_dias');
    if (!tiene('cien_dias')   && total >= 100)  nuevos.push('cien_dias');
  }

  // Volviste (gap de 3+ días sin entrar)
  if (!tiene('volviste') && !esNueva && rHistorial.data && rHistorial.data.length >= 2) {
    const penultima = new Date((rHistorial.data as any[])[1].created_at);
    const diffDias = Math.floor((Date.now() - penultima.getTime()) / 86400000);
    if (diffDias >= 3) nuevos.push('volviste');
  }

  // Volviste de una semana difícil
  if (!tiene('volviste_semana_dificil') && rSemana.data && rHistorial.data) {
    const entradas = rSemana.data as any[];
    if (entradas.length >= 3) {
      const promedioEstres = entradas.reduce((s, e) => s + (e.estres ?? 0), 0) / entradas.length;
      if (promedioEstres > 60 && (rHistorial.data as any[]).length >= 2) {
        const penultima = new Date((rHistorial.data as any[])[1].created_at);
        const diffDias = Math.floor((Date.now() - penultima.getTime()) / 86400000);
        if (diffDias >= 3) nuevos.push('volviste_semana_dificil');
      }
    }
  }

  // Rabia también es información (3 descargas con tag enojo)
  if (necesitaRabia && (rRabia.count ?? 0) >= 3) nuevos.push('rabia_informacion');

  // Guardiana del silencio (10 descargas)
  if (necesitaGuardiana && (rGuardiana.count ?? 0) >= 10) nuevos.push('guardiana_silencio');

  // Corazón agradecido (30) + Buscadora de luz (100) — misma query reutilizada
  if (necesitaGratitudes) {
    const total = rGratitudes.count ?? 0;
    if (!tiene('corazon_agradecido') && total >= 30)  nuevos.push('corazon_agradecido');
    if (!tiene('buscadora_luz')      && total >= 100) nuevos.push('buscadora_luz');
  }

  // Palabras sin palabras (10 audios)
  if (necesitaAudio && (rAudio.count ?? 0) >= 10) nuevos.push('palabras_sin_palabras');

  // Planta
  if (necesitaPlanta) {
    const gotas = (rPlanta.data as any)?.puntos ?? 0;
    if (!tiene('primera_semilla') && gotas >= 20)  nuevos.push('primera_semilla');
    if (!tiene('vida_completa')   && gotas >= 200) nuevos.push('vida_completa');
  }

  // ── Guardar nuevos en Supabase ────────────────────────────────────────────
  if (nuevos.length > 0) {
    await supabase.from('logros_usuario').insert(
      nuevos.map(id => ({ user_id: userId, logro_id: id }))
    );
  }

  return nuevos.map(id => LOGROS[id]);
}
