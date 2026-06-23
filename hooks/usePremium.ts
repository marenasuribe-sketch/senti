/**
 * Hook para verificar si el usuario tiene Senti+ activo.
 * Úsalo en cualquier pantalla que necesite mostrar/bloquear features.
 *
 * Ejemplo:
 *   const { esPremium, cargando } = usePremium();
 *   if (!esPremium) router.push('/upgrade');
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { obtenerPerfil, type Perfil } from '../lib/premium';

type UsePremiumResult = {
  esPremium: boolean;
  perfil: Perfil | null;
  cargando: boolean;
};

// Cache compartido entre instancias — evita 3 queries a Supabase al navegar entre tabs
let _cache: { userId: string; perfil: Perfil; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 segundos

export function usePremium(): UsePremiumResult {
  const [perfil, setPerfil]   = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || cancelado) { setCargando(false); return; }

      // Usar caché si sigue fresco
      if (_cache && _cache.userId === userId && Date.now() - _cache.ts < CACHE_TTL) {
        if (!cancelado) { setPerfil(_cache.perfil); setCargando(false); }
        return;
      }

      const p = await obtenerPerfil(supabase, userId);
      if (!cancelado) {
        _cache = { userId, perfil: p, ts: Date.now() };
        setPerfil(p);
        setCargando(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, []);

  return {
    esPremium: perfil?.es_premium ?? false,
    perfil,
    cargando,
  };
}
