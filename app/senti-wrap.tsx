import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { usePremium } from '../hooks/usePremium';
import { PLANTAS_INFO } from '../lib/planta';

type WrapData = {
  totalEntradas: number;
  totalGratitudes: number;
  mejorRacha: number;
  mesActivo: string;
  plantaNombre: string;
  plantaEmoji: string;
  gotas: number;
  promedioEstres: number;
  promedioCalma: number;
  emocionTop: string;
  mesesActivos: number;
  año: number;
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function SentiWrapScreen() {
  const router = useRouter();
  const { esPremium } = usePremium();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState<WrapData | null>(null);
  const [actividadMensual, setActividadMensual] = useState<number[]>(Array(12).fill(0));

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { setCargando(false); return; }

    const año = new Date().getFullYear();
    const inicioAño = `${año}-01-01T00:00:00.000Z`;

    const [
      { data: journals },
      { data: gratitudes },
      { data: planta },
    ] = await Promise.all([
      supabase.from('journal').select('created_at, estres, calma, energia').eq('user_id', userId).gte('created_at', inicioAño),
      supabase.from('gratitudes').select('created_at').eq('user_id', userId).gte('created_at', inicioAño),
      supabase.from('plantas_usuario').select('nombre, puntos').eq('user_id', userId).maybeSingle(),
    ]);

    // Actividad por mes
    const porMes = Array(12).fill(0);
    (journals ?? []).forEach(j => { porMes[new Date(j.created_at).getMonth()]++; });
    (gratitudes ?? []).forEach(g => { porMes[new Date(g.created_at).getMonth()]++; });
    setActividadMensual(porMes);

    // Mes más activo
    const maxMes = porMes.indexOf(Math.max(...porMes));
    const mesActivo = Math.max(...porMes) > 0 ? MESES[maxMes] : '—';

    // Mejor racha (calcular desde fechas de gratitudes + journals)
    const todasFechas = [
      ...(journals ?? []).map(j => new Date(j.created_at).toDateString()),
      ...(gratitudes ?? []).map(g => new Date(g.created_at).toDateString()),
    ];
    const fechasUnicas = [...new Set(todasFechas)].sort();
    let mejorRacha = 0, rachaActual = 0;
    for (let i = 0; i < fechasUnicas.length; i++) {
      if (i === 0) { rachaActual = 1; continue; }
      const prev = new Date(fechasUnicas[i - 1]);
      const curr = new Date(fechasUnicas[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      rachaActual = diff === 1 ? rachaActual + 1 : 1;
      if (rachaActual > mejorRacha) mejorRacha = rachaActual;
    }
    if (rachaActual > mejorRacha) mejorRacha = rachaActual;

    // Promedios emocionales
    const jConEmociones = (journals ?? []).filter(j => j.estres != null || j.calma != null);
    const promedioEstres = jConEmociones.length > 0
      ? Math.round(jConEmociones.reduce((acc, j) => acc + (j.estres ?? 0), 0) / jConEmociones.length)
      : 0;
    const promedioCalma = jConEmociones.length > 0
      ? Math.round(jConEmociones.reduce((acc, j) => acc + (j.calma ?? 0), 0) / jConEmociones.length)
      : 0;

    const emocionTop = promedioCalma > promedioEstres ? 'Calma' : promedioEstres > 60 ? 'Estrés' : 'Equilibrio';
    const mesesActivos = porMes.filter(n => n > 0).length;

    const plantaInfo = PLANTAS_INFO[planta?.nombre ?? 'bambu'];

    setData({
      totalEntradas: (journals ?? []).length,
      totalGratitudes: (gratitudes ?? []).length,
      mejorRacha: Math.max(mejorRacha, 1),
      mesActivo,
      plantaNombre: plantaInfo?.nombre ?? 'Bambú',
      plantaEmoji: plantaInfo?.emoji ?? '🎋',
      gotas: planta?.puntos ?? 0,
      promedioEstres,
      promedioCalma,
      emocionTop,
      mesesActivos,
      año,
    });
    setCargando(false);
  }

  async function compartir() {
    if (!data) return;
    await Share.share({
      message: `Mi Senti Wrap ${data.año} 🌱\n\n✍️ ${data.totalEntradas} entradas en el diario\n🙏 ${data.totalGratitudes} momentos de gratitud\n🔥 Mejor racha: ${data.mejorRacha} días\n💧 ${data.gotas} gotas para mi ${data.plantaNombre}\n\nUn año de crecimiento contigo misma. 🌿`,
    });
  }

  const maxMes = Math.max(...actividadMensual, 1);

  if (cargando) {
    return <View style={S.cargandoBg}><ActivityIndicator color="#3d6841" /></View>;
  }

  if (!esPremium) {
    return (
      <View style={S.lockedBg}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#31332c" />
        </TouchableOpacity>
        <Text style={S.lockedEmoji}>🌿</Text>
        <Text style={S.lockedTitle}>Senti Wrap</Text>
        <Text style={S.lockedSub}>Tu resumen anual de bienestar, estilo Spotify Wrapped — disponible con Senti+.</Text>
        <TouchableOpacity style={S.upgradeBtn} onPress={() => router.push('/upgrade' as any)} activeOpacity={0.85}>
          <Text style={S.upgradeBtnText}>Ver planes Senti+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      {/* Header */}
      <View style={S.topBar}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#31332c" />
        </TouchableOpacity>
        <TouchableOpacity onPress={compartir} activeOpacity={0.7} style={S.shareBtn}>
          <Ionicons name="share-outline" size={18} color="#3d6841" />
          <Text style={S.shareBtnText}>Compartir</Text>
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={S.hero}>
        <Text style={S.heroAño}>{data.año}</Text>
        <Text style={S.heroTitle}>Tu año en Senti.</Text>
        <Text style={S.heroSub}>Un año de volverte a ti misma.</Text>
      </View>

      {/* Stat grande — planta */}
      <View style={S.plantaCard}>
        <Text style={S.plantaEmoji}>{data.plantaEmoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={S.plantaLabel}>TU COMPAÑERA ESTE AÑO</Text>
          <Text style={S.plantaNombre}>{data.plantaNombre}</Text>
          <Text style={S.plantaGotas}>💧 {data.gotas} gotas recibidas</Text>
        </View>
      </View>

      {/* Stats principales */}
      <View style={S.statsGrid}>
        <View style={[S.statBlock, { backgroundColor: '#3d6841' }]}>
          <Text style={[S.statNum, { color: '#e4ffe0' }]}>{data.totalEntradas}</Text>
          <Text style={[S.statLbl, { color: '#bfefbd' }]}>ENTRADAS DE DIARIO</Text>
        </View>
        <View style={[S.statBlock, { backgroundColor: '#eee1cc' }]}>
          <Text style={[S.statNum, { color: '#31332c' }]}>{data.totalGratitudes}</Text>
          <Text style={[S.statLbl, { color: '#675e4d' }]}>MOMENTOS DE GRATITUD</Text>
        </View>
        <View style={[S.statBlock, { backgroundColor: '#bfefbd' }]}>
          <Text style={[S.statNum, { color: '#1e4824' }]}>{data.mejorRacha}</Text>
          <Text style={[S.statLbl, { color: '#3d6841' }]}>DÍAS DE MEJOR RACHA</Text>
        </View>
        <View style={[S.statBlock, { backgroundColor: '#f5f4ed' }]}>
          <Text style={[S.statNum, { color: '#31332c' }]}>{data.mesesActivos}</Text>
          <Text style={[S.statLbl, { color: '#797c73' }]}>MESES ACTIVOS</Text>
        </View>
      </View>

      {/* Mes favorito */}
      {data.mesActivo !== '—' && (
        <View style={S.mesCard}>
          <Text style={S.mesLabel}>TU MES MÁS ACTIVO FUE</Text>
          <Text style={S.mesNombre}>{data.mesActivo}</Text>
          <Text style={S.mesSub}>Qué bonito verte tan constante en ese mes.</Text>
        </View>
      )}

      {/* Gráfico de barras mensual */}
      <View style={S.barCard}>
        <Text style={S.barTitle}>Actividad por mes</Text>
        <View style={S.barsRow}>
          {actividadMensual.map((n, i) => (
            <View key={i} style={S.barCol}>
              <View style={S.barTrack}>
                <View style={[S.barFill, { height: `${Math.max((n / maxMes) * 100, n > 0 ? 8 : 0)}%` }]} />
              </View>
              <Text style={S.barMes}>{MESES[i].slice(0, 1)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Emoción predominante */}
      <View style={S.emocionCard}>
        <View style={S.emocionHeader}>
          <Ionicons name="sparkles" size={20} color="#3d6841" />
          <Text style={S.emocionLabel}>TU EMOCIÓN PREDOMINANTE</Text>
        </View>
        <Text style={S.emocionNombre}>{data.emocionTop}</Text>
        {data.promedioCalma > 0 && (
          <View style={S.barraRow}>
            <Text style={S.barraLbl}>Calma promedio</Text>
            <View style={S.barraTrack}>
              <View style={[S.barraFill, { width: `${data.promedioCalma}%`, backgroundColor: '#3d6841' }]} />
            </View>
            <Text style={S.barraVal}>{data.promedioCalma}%</Text>
          </View>
        )}
        {data.promedioEstres > 0 && (
          <View style={S.barraRow}>
            <Text style={S.barraLbl}>Estrés promedio</Text>
            <View style={S.barraTrack}>
              <View style={[S.barraFill, { width: `${data.promedioEstres}%`, backgroundColor: '#9e422c' }]} />
            </View>
            <Text style={S.barraVal}>{data.promedioEstres}%</Text>
          </View>
        )}
      </View>

      {/* Mensaje de cierre */}
      <View style={S.cierreCard}>
        <Text style={S.cierreEmoji}>🌱</Text>
        <Text style={S.cierreTexto}>
          {data.totalEntradas + data.totalGratitudes > 50
            ? `${data.año} fue un año de presencia real. Escribiste, soltaste, agradeciste. Tu planta lo siente.`
            : `Todo proceso empieza con el primer paso. Ya diste muchos este año — y eso cuenta.`}
        </Text>
      </View>

    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },
  content:      { paddingBottom: 60 },
  cargandoBg:   { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' },

  lockedBg:     { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  backBtn:      { position: 'absolute', top: 60, left: 24 },
  lockedEmoji:  { fontSize: 64, marginTop: 80 },
  lockedTitle:  { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, color: '#31332c', letterSpacing: -0.6 },
  lockedSub:    { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', textAlign: 'center', lineHeight: 23 },
  upgradeBtn:   { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  upgradeBtnText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },

  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  shareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 8, paddingHorizontal: 14 },
  shareBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#3d6841' },

  hero:         { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 6 },
  heroAño:      { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#797c73', letterSpacing: 2 },
  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 42, color: '#31332c', letterSpacing: -1, lineHeight: 48 },
  heroSub:      { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#5e6058', lineHeight: 24, fontStyle: 'italic' },

  plantaCard:   { marginHorizontal: 24, backgroundColor: '#f5f4ed', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  plantaEmoji:  { fontSize: 52 },
  plantaLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.5 },
  plantaNombre: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: '#31332c', letterSpacing: -0.4 },
  plantaGotas:  { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', marginTop: 2 },

  statsGrid:    { marginHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBlock:    { width: '47%', borderRadius: 20, padding: 20, gap: 6 },
  statNum:      { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, letterSpacing: -0.8 },
  statLbl:      { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1.2 },

  mesCard:      { marginHorizontal: 24, backgroundColor: '#3d6841', borderRadius: 24, padding: 28, alignItems: 'center', gap: 6, marginBottom: 16 },
  mesLabel:     { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#bfefbd', letterSpacing: 1.5 },
  mesNombre:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 48, color: '#e4ffe0', letterSpacing: -1 },
  mesSub:       { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#bfefbd', fontStyle: 'italic', textAlign: 'center' },

  barCard:      { marginHorizontal: 24, backgroundColor: '#ffffff', borderRadius: 24, padding: 22, marginBottom: 16, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  barTitle:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#31332c', marginBottom: 16, letterSpacing: -0.2 },
  barsRow:      { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 },
  barCol:       { flex: 1, alignItems: 'center', gap: 4 },
  barTrack:     { flex: 1, width: '70%', backgroundColor: '#f5f4ed', borderRadius: 4, justifyContent: 'flex-end' },
  barFill:      { backgroundColor: '#bfefbd', borderRadius: 4, width: '100%' },
  barMes:       { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73' },

  emocionCard:  { marginHorizontal: 24, backgroundColor: '#f5f4ed', borderRadius: 24, padding: 22, gap: 14, marginBottom: 16 },
  emocionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  emocionLabel: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.5 },
  emocionNombre:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, color: '#31332c', letterSpacing: -0.6, marginTop: -6 },
  barraRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraLbl:     { fontFamily: 'Manrope_500Medium', fontSize: 12, color: '#5e6058', width: 100 },
  barraTrack:   { flex: 1, height: 6, backgroundColor: '#e2e3d9', borderRadius: 3, overflow: 'hidden' },
  barraFill:    { height: '100%', borderRadius: 3 },
  barraVal:     { fontFamily: 'Manrope_700Bold', fontSize: 12, color: '#31332c', width: 36, textAlign: 'right' },

  cierreCard:   { marginHorizontal: 24, backgroundColor: '#bfefbd', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  cierreEmoji:  { fontSize: 40 },
  cierreTexto:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: '#1e4824', lineHeight: 26, textAlign: 'center', letterSpacing: -0.2, fontStyle: 'italic' },
});
