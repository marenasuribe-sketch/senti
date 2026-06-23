import { SupabaseClient } from '@supabase/supabase-js';

export type Capsula = {
  id: string;
  user_id: string;
  texto: string;
  fecha_apertura: string;
  abierta: boolean;
  respuesta: string | null;
  created_at: string;
};

export const OPCIONES_DURACION = [
  { label: '1 mes',   meses: 1 },
  { label: '3 meses', meses: 3 },
  { label: '6 meses', meses: 6 },
  { label: '1 año',   meses: 12 },
];

export function calcularFechaApertura(meses: number): Date {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + meses);
  return fecha;
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function diasRestantes(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function crearCapsula(
  supabase: SupabaseClient,
  userId: string,
  texto: string,
  meses: number,
  esPremium = false,
): Promise<{ error: string | null }> {
  const limite = esPremium ? 6 : 1;
  const { count, error: countError } = await supabase
    .from('capsulas')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('abierta', false);

  if (countError) return { error: 'No se pudo verificar tus cápsulas. Intenta de nuevo.' };

  if ((count ?? 0) >= limite) {
    return {
      error: esPremium
        ? 'Tienes 6 cápsulas activas. Espera a que se abra alguna para crear otra.'
        : 'LIMITE_CAPSULAS_GRATIS',
    };
  }

  const { error } = await supabase.from('capsulas').insert({
    user_id: userId,
    texto,
    fecha_apertura: calcularFechaApertura(meses).toISOString(),
    abierta: false,
  });

  return { error: error?.message ?? null };
}

export async function obtenerCapsulaLista(
  supabase: SupabaseClient,
  userId: string,
): Promise<Capsula | null> {
  const { data } = await supabase
    .from('capsulas')
    .select('*')
    .eq('user_id', userId)
    .eq('abierta', false)
    .lte('fecha_apertura', new Date().toISOString())
    .maybeSingle();
  return data ?? null;
}

export async function obtenerCapsulaActiva(
  supabase: SupabaseClient,
  userId: string,
): Promise<Capsula | null> {
  const { data } = await supabase
    .from('capsulas')
    .select('*')
    .eq('user_id', userId)
    .eq('abierta', false)
    .gt('fecha_apertura', new Date().toISOString())
    .maybeSingle();
  return data ?? null;
}

export async function marcarAbierta(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  respuesta?: string,
): Promise<void> {
  await supabase.from('capsulas').update({
    abierta: true,
    ...(respuesta ? { respuesta } : {}),
  }).eq('id', id).eq('user_id', userId);
}
