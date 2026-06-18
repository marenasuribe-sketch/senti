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
  icono: string;       // nombre de ícono de Ionicons
  categoria: 'inicio' | 'sentir' | 'constancia' | 'soltar' | 'voz' | 'planta';
};

// ─── Definición de los 18 logros ─────────────────────────────────────────────

export const LOGROS: Record<LogroId, Logro> = {
  // Hitos de inicio
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

  // Permitirte sentir
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

  // Constancia amable
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

  // Soltar y agradecer
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

  // Tu voz
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

  // Tu planta
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

// ─── Tipo de acción que dispara la verificación ───────────────────────────────

export type AccionLogro = {
  tipo: 'journal' | 'gratitud' | 'descarga';
  estres?: number;        // diario: nivel de estrés detectado por IA (0-100)
  tresAnclajes?: boolean; // gratitud: si escribió los 3 campos
  tags?: string[];        // descarga: tags seleccionados
  viaAudio?: boolean;     // si la entrada fue por audio (descarga)
};

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Verifica qué logros se acaban de desbloquear tras una acción.
 * Guarda los nuevos en Supabase y los devuelve para mostrar el modal.
 *
 * Llámala después de cualquier insert en journal / gratitudes.
 * Devuelve array de logros nuevos (normalmente 0-1, rara vez 2).
 */
export async function verificarLogros(
  supabase: SupabaseClient,
  userId: string,
  accion: AccionLogro,
): Promise<Logro[]> {
  // Logros ya desbloqueados (para no repetirlos)
  const { data: yaDesbloqueados } = await supabase
    .from('logros_usuario')
    .select('logro_id')
    .eq('user_id', userId);

  const desbloqueados = new Set((yaDesbloqueados ?? []).map(l => l.logro_id as LogroId));

  // Helper: checar si ya tiene el logro
  const tiene = (id: LogroId) => desbloqueados.has(id);

  // Nuevos logros detectados en esta acción
  const nuevos: LogroId[] = [];

  // ── HITOS DE INICIO ───────────────────────────────────────────────────────

  // Primera gota — primera acción de cualquier tipo
  if (!tiene('primera_gota')) {
    nuevos.push('primera_gota');
  }

  // Tres anclajes — completó las 3 gratitudes en un mismo guardado
  if (!tiene('tres_anclajes') && accion.tipo === 'gratitud' && accion.tresAnclajes) {
    nuevos.push('tres_anclajes');
  }

  // Primera descarga
  if (!tiene('primera_descarga') && accion.tipo === 'descarga') {
    nuevos.push('primera_descarga');
  }

  // ── PERMITIRTE SENTIR ─────────────────────────────────────────────────────

  // Le diste nombre a la tristeza — estrés > 65 en el diario por primera vez
  if (!tiene('nombre_tristeza') && accion.tipo === 'journal' && (accion.estres ?? 0) > 65) {
    nuevos.push('nombre_tristeza');
  }

  // La rabia también es información — 3 descargas con tag "enojo"
  if (!tiene('rabia_informacion') && accion.tipo === 'descarga' && accion.tags?.includes('enojo')) {
    const { count } = await supabase
      .from('journal')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('es_descarga', true)
      .contains('tags', ['enojo']);
    if ((count ?? 0) >= 3) nuevos.push('rabia_informacion');
  }

  // Aceptaste no saber — seleccionó tag "otro" en Descarga
  if (!tiene('aceptaste_no_saber') && accion.tipo === 'descarga' && accion.tags?.includes('otro')) {
    nuevos.push('aceptaste_no_saber');
  }

  // Volviste de una semana difícil — semana pasada con estrés promedio > 60
  // y la persona no había usado la app en 3+ días
  if (!tiene('volviste_semana_dificil')) {
    const haceUnaSemanaDias = new Date();
    haceUnaSemanaDias.setDate(haceUnaSemanaDias.getDate() - 7);

    const { data: semanaAnterior } = await supabase
      .from('journal')
      .select('created_at, estres')
      .eq('user_id', userId)
      .gte('created_at', haceUnaSemanaDias.toISOString())
      .not('estres', 'is', null);

    const entradas = semanaAnterior ?? [];
    const promedioEstres = entradas.length >= 3
      ? entradas.reduce((s, e) => s + (e.estres ?? 0), 0) / entradas.length
      : 0;

    if (promedioEstres > 60) {
      // Verificar que hubo gap de 3+ días antes de esta acción
      const { data: ultimaAntes } = await supabase
        .from('journal')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);

      const entradas2 = ultimaAntes ?? [];
      if (entradas2.length >= 2) {
        const penultima = new Date(entradas2[1].created_at);
        const hoy = new Date();
        const diffDias = Math.floor((hoy.getTime() - penultima.getTime()) / 86400000);
        if (diffDias >= 3) nuevos.push('volviste_semana_dificil');
      }
    }
  }

  // ── CONSTANCIA AMABLE ─────────────────────────────────────────────────────

  // Volviste — abrió después de 3+ días sin entrar (solo si no es nueva usuaria)
  if (!tiene('volviste') && !nuevos.includes('primera_gota')) {
    const { data: historial } = await supabase
      .from('journal')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2);

    const entradasH = historial ?? [];
    if (entradasH.length >= 2) {
      const penultima = new Date(entradasH[1].created_at);
      const hoy = new Date();
      const diffDias = Math.floor((hoy.getTime() - penultima.getTime()) / 86400000);
      if (diffDias >= 3) nuevos.push('volviste');
    }
  }

  // Días acumulados — contar días únicos con actividad
  if (!tiene('siete_dias') || !tiene('treinta_dias') || !tiene('cien_dias')) {
    const [{ data: journalDias }, { data: gratitudDias }] = await Promise.all([
      supabase.from('journal').select('created_at').eq('user_id', userId),
      supabase.from('gratitudes').select('created_at').eq('user_id', userId),
    ]);

    const diasUnicos = new Set([
      ...(journalDias ?? []).map(e => new Date(e.created_at).toDateString()),
      ...(gratitudDias ?? []).map(e => new Date(e.created_at).toDateString()),
    ]);
    const totalDias = diasUnicos.size;

    if (!tiene('siete_dias') && totalDias >= 7)    nuevos.push('siete_dias');
    if (!tiene('treinta_dias') && totalDias >= 30)  nuevos.push('treinta_dias');
    if (!tiene('cien_dias') && totalDias >= 100)    nuevos.push('cien_dias');
  }

  // ── SOLTAR Y AGRADECER ────────────────────────────────────────────────────

  // Guardiana del silencio — 10 descargas
  if (!tiene('guardiana_silencio') && accion.tipo === 'descarga') {
    const { count } = await supabase
      .from('journal')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('es_descarga', true);
    if ((count ?? 0) >= 10) nuevos.push('guardiana_silencio');
  }

  // Corazón agradecido — 30 gratitudes
  if (!tiene('corazon_agradecido') && accion.tipo === 'gratitud') {
    const { count } = await supabase
      .from('gratitudes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) >= 30) nuevos.push('corazon_agradecido');
  }

  // Buscadora de luz — 100 gratitudes
  if (!tiene('buscadora_luz') && accion.tipo === 'gratitud') {
    const { count } = await supabase
      .from('gratitudes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) >= 100) nuevos.push('buscadora_luz');
  }

  // ── TU VOZ ───────────────────────────────────────────────────────────────

  // Tu voz contó algo — primer audio
  if (!tiene('tu_voz') && accion.viaAudio) {
    nuevos.push('tu_voz');
  }

  // Le diste palabras a lo que no las tenía — 10 audios
  if (!tiene('palabras_sin_palabras') && accion.viaAudio) {
    const { count } = await supabase
      .from('journal')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('via_audio', true);
    if ((count ?? 0) >= 10) nuevos.push('palabras_sin_palabras');
  }

  // ── TU PLANTA ─────────────────────────────────────────────────────────────

  if (!tiene('primera_semilla') || !tiene('vida_completa')) {
    const { data: planta } = await supabase
      .from('plantas_usuario')
      .select('puntos')
      .eq('user_id', userId)
      .maybeSingle();

    const gotas = planta?.puntos ?? 0;
    if (!tiene('primera_semilla') && gotas >= 20)  nuevos.push('primera_semilla');
    if (!tiene('vida_completa')   && gotas >= 200) nuevos.push('vida_completa');
  }

  // ── Guardar los nuevos en Supabase ────────────────────────────────────────
  if (nuevos.length > 0) {
    await supabase.from('logros_usuario').insert(
      nuevos.map(id => ({ user_id: userId, logro_id: id }))
    );
  }

  return nuevos.map(id => LOGROS[id]);
}
