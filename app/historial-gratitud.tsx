import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { obtenerPerfil } from '../lib/premium';

const PAGE_SIZE = 30;
const DIAS_HISTORIAL_GRATIS = 30;

type Gratitud = { id: string; texto: string; created_at: string };

type EntradaParsed = {
  id: string;
  created_at: string;
  momento: string;
  persona: string;
  victoria: string;
};

function parsearTexto(texto: string): { momento: string; persona: string; victoria: string } {
  const momento  = texto.match(/Momento:\s*(.+?)(?:\n|$)/)?.[1]?.trim()  ?? '';
  const persona  = texto.match(/Persona:\s*(.+?)(?:\n|$)/)?.[1]?.trim()  ?? '';
  const victoria = texto.match(/Victoria:\s*(.+?)(?:\n|$)/)?.[1]?.trim() ?? '';
  return { momento, persona, victoria };
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatMes(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function agruparPorMes(entradas: EntradaParsed[]): { mes: string; items: EntradaParsed[] }[] {
  const mapa = new Map<string, EntradaParsed[]>();
  entradas.forEach(e => {
    const mes = formatMes(e.created_at);
    if (!mapa.has(mes)) mapa.set(mes, []);
    mapa.get(mes)!.push(e);
  });
  return Array.from(mapa.entries()).map(([mes, items]) => ({ mes, items }));
}

export default function HistorialGratitud() {
  const router = useRouter();
  const [entradas, setEntradas]   = useState<EntradaParsed[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas]       = useState(false);
  const [pagina, setPagina]       = useState(0);
  const [userId, setUserId]       = useState<string | null>(null);
  const [esPremium, setEsPremium] = useState(false);

  const cargarPagina = useCallback(async (uid: string, offset: number, acumular: boolean, premium: boolean) => {
    let query = supabase
      .from('gratitudes')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!premium) {
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - DIAS_HISTORIAL_GRATIS);
      query = query.gte('created_at', hace30.toISOString());
    }

    const { data } = await query.range(offset, offset + PAGE_SIZE - 1);

    const parsed = (data ?? []).map((g: Gratitud) => ({
      id: g.id,
      created_at: g.created_at,
      ...parsearTexto(g.texto),
    }));

    setEntradas(prev => acumular ? [...prev, ...parsed] : parsed);
    setHayMas(parsed.length === PAGE_SIZE);
  }, []);

  useEffect(() => {
    async function iniciar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { return; }
        setUserId(uid);
        const perfil = await obtenerPerfil(supabase, uid);
        setEsPremium(perfil.es_premium);
        await cargarPagina(uid, 0, false, perfil.es_premium);
      } catch {
        // Error de red: mostrar lista vacía
      } finally {
        setCargando(false);
      }
    }
    iniciar();
  }, [cargarPagina]);

  async function cargarMas() {
    if (!userId || cargandoMas || !hayMas) return;
    setCargandoMas(true);
    const nuevaPagina = pagina + 1;
    await cargarPagina(userId, nuevaPagina * PAGE_SIZE, true, esPremium);
    setPagina(nuevaPagina);
    setCargandoMas(false);
  }

  const grupos = agruparPorMes(entradas);

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={S.headerTitle}>Historial</Text>
          <Text style={S.headerSub}>
            {esPremium ? 'Todo lo que has anotado' : `Últimos ${DIAS_HISTORIAL_GRATIS} días`}
          </Text>
        </View>
      </View>

      {cargando ? (
        <View style={S.centered}>
          <ActivityIndicator color="#3d6841" />
        </View>
      ) : entradas.length === 0 ? (
        <View style={S.centered}>
          <Text style={S.emptyEmoji}>🌱</Text>
          <Text style={S.emptyTitle}>Todavía no hay entradas</Text>
          <Text style={S.emptySub}>Cuando guardes tus primeras gratitudes, aparecerán aquí.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.content}>
          {/* Resumen */}
          <View style={S.resumen}>
            <Text style={S.resumenNum}>{entradas.length}</Text>
            <Text style={S.resumenLbl}>{entradas.length === 1 ? 'momento guardado' : 'momentos guardados'}</Text>
          </View>

          {/* Grupos por mes */}
          {grupos.map(({ mes, items }) => (
            <View key={mes} style={{ marginBottom: 8 }}>
              <Text style={S.mesLabel}>{mes.charAt(0).toUpperCase() + mes.slice(1)}</Text>
              {items.map(e => (
                <View key={e.id} style={S.card}>
                  <Text style={S.fechaText}>{formatFecha(e.created_at)}</Text>

                  {e.momento ? (
                    <View style={S.anclaRow}>
                      <Text style={S.anclaIcon}>☀️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={S.anclaLabel}>Un momento que disfruté</Text>
                        <Text style={S.anclaTexto}>{e.momento}</Text>
                      </View>
                    </View>
                  ) : null}

                  {e.persona ? (
                    <View style={S.anclaRow}>
                      <Text style={S.anclaIcon}>💚</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={S.anclaLabel}>Alguien que agradezco</Text>
                        <Text style={S.anclaTexto}>{e.persona}</Text>
                      </View>
                    </View>
                  ) : null}

                  {e.victoria ? (
                    <View style={S.anclaRow}>
                      <Text style={S.anclaIcon}>⭐</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={S.anclaLabel}>Una victoria personal</Text>
                        <Text style={S.anclaTexto}>{e.victoria}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}

          {hayMas && esPremium && (
            <TouchableOpacity style={S.btnMas} onPress={cargarMas} disabled={cargandoMas} activeOpacity={0.75}>
              {cargandoMas
                ? <ActivityIndicator size="small" color="#3d6841" />
                : <Text style={S.btnMasText}>Cargar más</Text>
              }
            </TouchableOpacity>
          )}

          {!esPremium && (
            <TouchableOpacity style={S.upgradeCard} onPress={() => router.push('/upgrade')} activeOpacity={0.85}>
              <Text style={S.upgradeCardEmoji}>🔒</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={S.upgradeCardTitle}>Historial completo con Senti+</Text>
                <Text style={S.upgradeCardSub}>Accede a todos tus momentos guardados, sin límite de tiempo.</Text>
              </View>
              <Text style={S.upgradeCardArrow}>→</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fbf9f4' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#f5f4ed' },
  backBtn:     { width: 36, height: 36, borderRadius: 12, backgroundColor: '#efeee6', alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c' },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: '#31332c' },
  headerSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#797c73', marginTop: 1 },

  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyEmoji:  { fontSize: 48 },
  emptyTitle:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', textAlign: 'center' },
  emptySub:    { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#797c73', textAlign: 'center', lineHeight: 20 },

  content:     { padding: 24, paddingBottom: 40 },
  resumen:     { backgroundColor: '#bfefbd', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, flexDirection: 'row', gap: 10, justifyContent: 'center' },
  resumenNum:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, color: '#3d6841' },
  resumenLbl:  { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#3d6841' },

  mesLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },

  card:        { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16 },
  fechaText:   { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#3d6841', marginBottom: 12, textTransform: 'capitalize' },

  anclaRow:    { flexDirection: 'row', gap: 10, paddingVertical: 12, alignItems: 'flex-start' },
  anclaIcon:   { fontSize: 16, marginTop: 1 },
  anclaLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  anclaTexto:  { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#31332c', lineHeight: 19 },

  btnMas:      { alignSelf: 'center', marginTop: 8, paddingVertical: 12, paddingHorizontal: 28, backgroundColor: '#f5f4ed', borderRadius: 9999 },
  btnMasText:  { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#3d6841' },

  upgradeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eee1cc', borderRadius: 20, padding: 20, marginTop: 16 },
  upgradeCardEmoji: { fontSize: 24 },
  upgradeCardTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#31332c' },
  upgradeCardSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#675e4d', lineHeight: 17 },
  upgradeCardArrow: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#675e4d' },
});
