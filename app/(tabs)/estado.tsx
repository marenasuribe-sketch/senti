import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import SentiLogo from '../../components/SentiLogo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { usePremium } from '../../hooks/usePremium';

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekLabel() {
  const lunes = startOfWeek();
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${fmt(lunes)} — ${fmt(domingo)}`;
}

type RachaResult = { dias: number; enGracia: boolean };

function calcularRacha(fechas: string[]): RachaResult {
  if (!fechas.length) return { dias: 0, enGracia: false };
  const dias = new Set(fechas.map(f => new Date(f).toDateString()));
  let racha = 0;
  const hoy = new Date();

  // Empezar desde hoy o ayer — si hoy no tiene entrada, damos 1 día de gracia
  const tieneHoy = dias.has(hoy.toDateString());
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const tieneAyer = dias.has(ayer.toDateString());
  const enGracia = !tieneHoy && tieneAyer;

  const inicio = tieneHoy ? 0 : 1; // si no hay hoy, empezar a contar desde ayer
  for (let i = inicio; i < 365; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    if (dias.has(d.toDateString())) racha++;
    else break;
  }
  return { dias: racha, enGracia };
}

type DayActivity = {
  journals: number;
  gratitudes: number;
  estres: number;   // promedio del día (0-100)
  calma: number;    // promedio del día (0-100)
  energia: number;  // promedio del día (0-100)
  hasData: boolean; // true si hubo al menos una entrada con análisis emocional ese día
};

/* ── Helpers para el gráfico de bienestar diario (curva con fill) ── */
const CHART_VW = 320;  // viewBox width (escala con width="100%")
const CHART_VH = 160;  // viewBox height — más alto para que respire
const PAD_X = 14;
const PAD_Y = 16;

/**
 * Bienestar diario (0-100) = mezcla de calma + energía, menos estrés.
 * Usado para el gráfico semanal de "ola emocional".
 */
function bienestarDiario(d: { estres: number; calma: number; energia: number }): number {
  return Math.round((d.calma + d.energia + (100 - d.estres)) / 3);
}

type Pt = { x: number; y: number };

function valueToPoint(value: number, dayIdx: number, totalDays: number): Pt {
  const usableW = CHART_VW - PAD_X * 2;
  const usableH = CHART_VH - PAD_Y * 2;
  return {
    x: PAD_X + (dayIdx / Math.max(1, totalDays - 1)) * usableW,
    y: PAD_Y + usableH - (value / 100) * usableH,
  };
}

/**
 * Curva spline suave (catmull-rom convertida a cubic Bezier).
 * Da líneas fluidas estilo "ola", no segmentos rectos.
 */
function smoothPath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function EstadoScreen() {
  const router = useRouter();
  const { esPremium } = usePremium();
  const [cargando, setCargando] = useState(true);
  const [racha, setRacha] = useState(0);
  const [enGracia, setEnGracia] = useState(false);
  const [bienestar, setBienestar] = useState(0);
  const [estresPromedio, setEstresPromedio] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [actividad, setActividad] = useState<DayActivity[]>(
    Array.from({ length: 7 }, () => ({ journals: 0, gratitudes: 0, estres: 0, calma: 0, energia: 0, hasData: false }))
  );
  const [memIdx, setMemIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => { cargar(); }, []));

  // Auto-rotar "Tu amigo recuerda" cada 7 segundos con fade suave
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setMemIdx(prev => prev + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  function cerrarSesion() {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres cerrar sesión? Volverás al inicio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('onboarding_complete');
            await AsyncStorage.removeItem('senti_intake');
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  async function cargar() {
    setCargando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { setCargando(false); return; }

      const semanaInicio = startOfWeek().toISOString();
      const semanaInicioDate = startOfWeek();

      const [{ data: journals }, { data: gratitudes }] = await Promise.all([
        supabase.from('journal').select('created_at, estres, calma, energia')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
        supabase.from('gratitudes').select('created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      ]);

      const fechasGrat = (gratitudes ?? []).map(g => g.created_at);
      const rachaResult = calcularRacha(fechasGrat);
      setRacha(rachaResult.dias);
      setEnGracia(rachaResult.enGracia);

      const act: DayActivity[] = Array.from({ length: 7 }, () => ({
        journals: 0, gratitudes: 0, estres: 0, calma: 0, energia: 0, hasData: false,
      }));
      // Acumuladores temporales por día para promediar emociones
      const sumas = Array.from({ length: 7 }, () => ({ estres: 0, calma: 0, energia: 0, count: 0 }));
      let estresSuma = 0, estresCount = 0;
      let bienSuma = 0, bienCount = 0;

      (journals ?? []).forEach(j => {
        const d = new Date(j.created_at);
        const diffDays = Math.floor((d.getTime() - semanaInicioDate.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) {
          act[diffDays].journals++;
          if (j.estres != null || j.calma != null || j.energia != null) {
            sumas[diffDays].count++;
            if (j.estres != null)  { sumas[diffDays].estres  += j.estres;  estresSuma += j.estres; estresCount++; }
            if (j.calma != null)   { sumas[diffDays].calma   += j.calma;   bienSuma   += j.calma;  bienCount++; }
            if (j.energia != null) { sumas[diffDays].energia += j.energia; }
          }
        }
      });

      // Promediar emociones por día
      sumas.forEach((s, i) => {
        if (s.count > 0) {
          act[i].estres  = Math.round(s.estres  / s.count);
          act[i].calma   = Math.round(s.calma   / s.count);
          act[i].energia = Math.round(s.energia / s.count);
          act[i].hasData = true;
        }
      });

      (gratitudes ?? []).forEach(g => {
        const d = new Date(g.created_at);
        const diffDays = Math.floor((d.getTime() - semanaInicioDate.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) act[diffDays].gratitudes++;
      });

      setActividad(act);
      const diasActivos = act.filter(d => d.journals > 0 || d.gratitudes > 0).length;
      setBienestar(bienCount > 0 ? Math.round(bienSuma / bienCount) : Math.round((diasActivos / 7) * 100));
      setEstresPromedio(estresCount > 0 ? Math.round(estresSuma / estresCount) : 0);

      const totalSemana = (journals ?? []).filter(j => j.created_at >= semanaInicio).length
        + (gratitudes ?? []).filter(g => g.created_at >= semanaInicio).length;
      setTotalEntradas(totalSemana);
    } finally {
      setCargando(false);
    }
  }

  const diasConActividad = actividad.filter(d => d.journals > 0 || d.gratitudes > 0).length;
  const diasConEmociones = actividad.filter(d => d.hasData).length;

  const heroSub = totalEntradas === 0
    ? 'Esta semana está empezando. Cada entrada cuenta.'
    : estresPromedio > 60
      ? 'Tu paisaje ha estado intenso esta semana. Date espacio para respirar.'
      : bienestar > 60
        ? 'Tu paisaje interior ha estado particularmente sereno esta semana.'
        : 'Estás encontrando tu ritmo. Cada día suma a tu bienestar.';

  const insight = totalEntradas === 0
    ? 'Empieza con una entrada hoy — verás patrones en pocos días.'
    : estresPromedio > 60
      ? `Tus días con más estrés tienen un promedio de ${estresPromedio}/100. Identificar qué los detona es el primer paso.`
      : `Llevas ${diasConActividad} días activos esta semana. La constancia está dando frutos.`;

  const memorias = [
    racha > 0
      ? `"Llevas ${racha} ${racha === 1 ? 'día' : 'días'} seguidos cuidándote. Eso dice mucho de ti."`
      : '"Empezar es lo más difícil. Ya estás aquí, y eso cuenta."',
    totalEntradas > 0
      ? `"Esta semana hiciste ${totalEntradas} ${totalEntradas === 1 ? 'entrada' : 'entradas'}. Cada una es un momento contigo misma."`
      : '"Cada vez que vuelves a Senti, te eliges a ti misma."',
    bienestar > 50
      ? '"Tu bienestar va subiendo. ¿Qué estás haciendo diferente?"'
      : '"Los pequeños pasos también construyen el camino."',
  ];

  if (cargando) {
    return (
      <View style={S.cargandoBg}><ActivityIndicator color="#3d6841" /></View>
    );
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      {/* TopBar */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <SentiLogo size={22} />
          <Text style={S.logoText}>Senti</Text>
          {esPremium && (
            <View style={S.premiumBadge}>
              <Text style={S.premiumBadgeText}>SENTI+</Text>
            </View>
          )}
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#5e6058" />
        </TouchableOpacity>
      </View>

      <View style={S.section}>

        {/* Hero editorial */}
        <Text style={S.heroLabel}>{weekLabel().toUpperCase()}</Text>
        <Text style={S.heroTitle}>Tu paisaje interior.</Text>
        <Text style={S.heroSub}>{heroSub}</Text>

        {/* Stats grandes — bienestar y estrés son promedio sobre 100 esta semana */}
        <View style={S.statsRow}>
          <View style={S.statCard}>
            <View style={S.statNumRow}>
              <Text style={[S.statNum, { color: '#3d6841' }]}>{bienestar}</Text>
              <Text style={[S.statDe, { color: '#3d6841' }]}>%</Text>
            </View>
            <Text style={S.statLbl}>BIENESTAR</Text>
            <Text style={S.statSub}>esta semana</Text>
          </View>
          <View style={S.statCard}>
            <View style={S.statNumRow}>
              <Text style={[S.statNum, { color: '#9e422c' }]}>{estresPromedio > 0 ? estresPromedio : '—'}</Text>
              {estresPromedio > 0 && <Text style={[S.statDe, { color: '#9e422c' }]}>%</Text>}
            </View>
            <Text style={S.statLbl}>ESTRÉS</Text>
            <Text style={S.statSub}>esta semana</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statNum, { color: '#675e4d' }]}>{racha}</Text>
            <Text style={S.statLbl}>DÍAS SEGUIDOS</Text>
            <Text style={S.statSub}>{racha === 1 ? 'día' : 'días'}</Text>
          </View>
        </View>

        {/* Card visualización — patrones emocionales */}
        <View style={S.chartCard}>
          <View style={S.chartHeader}>
            <Text style={S.chartLabel}>PATRONES EMOCIONALES</Text>
            <Text style={S.chartSub}>
              {diasConEmociones === 0
                ? 'Aún sin datos esta semana'
                : `${diasConEmociones} ${diasConEmociones === 1 ? 'día' : 'días'} con análisis`}
            </Text>
          </View>

          {/* Gráfico de "ola emocional" — una curva con fill verde gradiente */}
          {diasConEmociones === 0 ? (
            <View style={S.chartEmpty}>
              <Text style={S.chartEmptyText}>
                Tu paisaje emocional aparecerá aquí cuando uses el Diario.
              </Text>
            </View>
          ) : (() => {
            // Construir puntos solo con días que tienen análisis emocional
            const points = actividad
              .map((d, i) => d.hasData ? valueToPoint(bienestarDiario(d), i, 7) : null)
              .filter((p): p is Pt => p !== null);
            const linePath = smoothPath(points);
            // Cerrar la curva hacia el fondo para crear el área de fill
            const bottomY = CHART_VH - PAD_Y;
            const areaPath = points.length >= 2
              ? `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`
              : '';

            return (
              <View>
                <Svg viewBox={`0 0 ${CHART_VW} ${CHART_VH}`} width="100%" height={170}>
                  <Defs>
                    <LinearGradient id="oladaGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#3d6841" stopOpacity="0.32" />
                      <Stop offset="1" stopColor="#3d6841" stopOpacity="0.02" />
                    </LinearGradient>
                  </Defs>

                  {/* Guideline horizontal sutil arriba */}
                  <Line
                    x1={PAD_X} y1={PAD_Y}
                    x2={CHART_VW - PAD_X} y2={PAD_Y}
                    stroke="#d8d9cf" strokeWidth={0.8}
                  />

                  {/* Área con gradiente */}
                  {areaPath !== '' && (
                    <Path d={areaPath} fill="url(#oladaGradient)" />
                  )}

                  {/* Línea curva principal */}
                  <Path
                    d={linePath}
                    stroke="#3d6841"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>

                {/* Etiquetas de días */}
                <View style={S.diasRow}>
                  {DIAS.map((d, i) => (
                    <Text key={i} style={[S.diaLbl, !actividad[i].hasData && { opacity: 0.4 }]}>
                      {d}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* Insight chip */}
          <View style={S.insightChip}>
            <View style={S.insightIcon}>
              <Ionicons name="sparkles" size={14} color="#3d6841" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.insightTitle}>Perspectiva de la semana</Text>
              <Text style={S.insightText}>{insight}</Text>
            </View>
          </View>
        </View>

        {/* Memory snippets */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Tu amigo recuerda</Text>
        </View>

        <View style={S.memCard}>
          <Ionicons name="leaf-outline" size={20} color="#3d6841" style={{ marginBottom: 10 }} />
          <Animated.Text style={[S.memText, { opacity: fadeAnim }]}>
            {memorias[memIdx % memorias.length]}
          </Animated.Text>
        </View>

        {/* Recomendaciones */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Para esta semana</Text>
        </View>

        <View style={S.recsCard}>
          {enGracia ? (
            <View style={S.recItem}>
              <View style={[S.recDot, { backgroundColor: '#bfefbd' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>Un día no define tu proceso. Llevas {racha} {racha === 1 ? 'día' : 'días'} cuidándote — mañana sigues.</Text>
                <Text style={S.recTag}>RACHA AMABLE</Text>
              </View>
            </View>
          ) : racha === 0 ? (
            <View style={S.recItem}>
              <View style={[S.recDot, { backgroundColor: '#C4A86A' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>Volver es siempre un buen comienzo. Abre el Diario o la Gratitud hoy — no tiene que ser largo.</Text>
                <Text style={S.recTag}>SUGERENCIA DEL DÍA</Text>
              </View>
            </View>
          ) : racha < 3 ? (
            <View style={S.recItem}>
              <View style={[S.recDot, { backgroundColor: '#3d6841' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>Llevas {racha} {racha === 1 ? 'día' : 'días'} seguidos. Estás creando un hábito.</Text>
                <Text style={S.recTag}>RACHA EN PROGRESO</Text>
              </View>
            </View>
          ) : (
            <View style={S.recItem}>
              <View style={[S.recDot, { backgroundColor: '#3d6841' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>{racha} días seguidos. Tu constancia está dando frutos — tu planta también lo siente.</Text>
                <Text style={S.recTag}>RACHA ACTIVA</Text>
              </View>
            </View>
          )}

          {estresPromedio > 60 && (
            <View style={[S.recItem, S.recLast]}>
              <View style={[S.recDot, { backgroundColor: '#9e422c' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>Esta semana tu estrés promedio fue de {estresPromedio}/100. ¿Hay algo que puedas soltar antes de dormir hoy?</Text>
                <Text style={S.recTag}>PATRÓN DETECTADO</Text>
              </View>
            </View>
          )}

          {estresPromedio <= 60 && bienestar > 50 && (
            <View style={[S.recItem, S.recLast]}>
              <View style={[S.recDot, { backgroundColor: '#3d6841' }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.recText}>Tu bienestar va bien. ¿Qué estás haciendo diferente que puedas repetir?</Text>
                <Text style={S.recTag}>OPORTUNIDAD</Text>
              </View>
            </View>
          )}
        </View>

        {/* Senti+ — accesos premium */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Senti+</Text>
          {!esPremium && (
            <TouchableOpacity onPress={() => router.push('/upgrade' as any)} activeOpacity={0.7}>
              <Text style={S.sectionLink}>Ver planes →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={S.premiumGrid}>
          <TouchableOpacity
            style={S.premiumCard}
            onPress={() => esPremium ? router.push('/mis-consejos' as any) : router.push('/upgrade' as any)}
            activeOpacity={0.8}
          >
            <View style={S.premiumCardIcon}>
              <Ionicons name="bookmark" size={18} color="#3d6841" />
            </View>
            <Text style={S.premiumCardTitle}>Mis consejos</Text>
            <Text style={S.premiumCardSub}>Lo que tu diario te dijo</Text>
            {!esPremium && <Ionicons name="lock-closed" size={12} color="#b1b3a9" style={{ marginTop: 4 }} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={S.premiumCard}
            onPress={() => esPremium ? router.push('/exportar-diario' as any) : router.push('/upgrade' as any)}
            activeOpacity={0.8}
          >
            <View style={S.premiumCardIcon}>
              <Ionicons name="document-text" size={18} color="#3d6841" />
            </View>
            <Text style={S.premiumCardTitle}>Exportar PDF</Text>
            <Text style={S.premiumCardSub}>Descarga tu diario</Text>
            {!esPremium && <Ionicons name="lock-closed" size={12} color="#b1b3a9" style={{ marginTop: 4 }} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.premiumCard, { width: '100%', flex: 0, flexDirection: 'row', alignItems: 'center', gap: 14 }]}
            onPress={() => router.push('/senti-wrap' as any)}
            activeOpacity={0.8}
          >
            <View style={S.premiumCardIcon}>
              <Ionicons name="sparkles" size={18} color="#3d6841" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.premiumCardTitle}>Senti Wrap {new Date().getFullYear()}</Text>
              <Text style={S.premiumCardSub}>Tu resumen anual de bienestar</Text>
            </View>
            {!esPremium && <Ionicons name="lock-closed" size={14} color="#b1b3a9" />}
            <Ionicons name="chevron-forward" size={16} color="#797c73" />
          </TouchableOpacity>
        </View>

        {/* Accesos rápidos */}
        <View style={S.accesoRow}>
          <TouchableOpacity style={S.accesoBtn} onPress={() => router.push('/logros' as any)} activeOpacity={0.75}>
            <Ionicons name="trophy-outline" size={16} color="#3d6841" />
            <Text style={S.accesoBtnText}>Ver logros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.accesoBtn} onPress={() => router.push('/privacidad' as any)} activeOpacity={0.75}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#5e6058" />
            <Text style={[S.accesoBtnText, { color: '#5e6058' }]}>Privacidad</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={S.btnLogout} onPress={cerrarSesion} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color="#797c73" />
          <Text style={S.btnLogoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },
  content:      { paddingBottom: 48 },
  cargandoBg:   { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' },

  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },
  premiumBadge: { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 3, paddingHorizontal: 10 },
  premiumBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#e4ffe0', letterSpacing: 1.5 },

  section:      { paddingHorizontal: 24, paddingTop: 16, gap: 20 },

  heroLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, marginBottom: -8 },
  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#31332c', letterSpacing: -0.8, lineHeight: 42 },
  heroSub:      { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', lineHeight: 23, marginTop: -12 },

  statsRow:     { flexDirection: 'row', gap: 10 },
  statCard:     { flex: 1, backgroundColor: '#ffffff', borderRadius: 18, padding: 18, alignItems: 'center', gap: 4, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  statNumRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statNum:      { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, letterSpacing: -0.6 },
  statDe:       { fontFamily: 'Manrope_500Medium', fontSize: 13, opacity: 0.6 },
  statLbl:      { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.2, textAlign: 'center', marginTop: 2 },
  statSub:      { fontFamily: 'Manrope_400Regular', fontSize: 10, color: '#b1b3a9', marginTop: -2 },

  chartCard:    { backgroundColor: '#f5f4ed', borderRadius: 24, padding: 24, gap: 20 },
  chartHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  chartSub:     { fontFamily: 'Manrope_500Medium', fontSize: 11, color: '#797c73' },

  // Estilos del chart de "ola emocional"
  chartEmpty:   { paddingVertical: 32, alignItems: 'center' },
  chartEmptyText:{ fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#797c73', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  diasRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: -2 },
  diaLbl:       { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 0.8, textAlign: 'center', flex: 1 },

  insightChip:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#ffffff', borderRadius: 14, padding: 14 },
  insightIcon:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#bfefbd', alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#31332c', marginBottom: 2 },
  insightText:  { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#5e6058', lineHeight: 18 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#31332c', letterSpacing: -0.4 },
  sectionLink:  { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#3d6841' },

  memCard:      { backgroundColor: '#bfefbd', borderRadius: 20, padding: 22 },
  memText:      { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: '#1e4824', lineHeight: 26, fontStyle: 'italic', letterSpacing: -0.2 },

  recsCard:     { backgroundColor: '#ffffff', borderRadius: 20, padding: 8, gap: 4, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  recItem:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#f5f4ed', borderRadius: 14 },
  recLast:      {},
  recDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  recText:      { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#31332c', lineHeight: 21 },
  recTag:       { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.2, marginTop: 4 },

  accesoRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  accesoBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f5f4ed', borderRadius: 14, paddingVertical: 12 },
  accesoBtnText:{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#3d6841' },

  btnLogout:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 4 },
  btnLogoutText:{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#797c73' },

  premiumGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  premiumCard:      { flex: 1, backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 4, alignItems: 'flex-start', shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  premiumCardIcon:  { width: 36, height: 36, borderRadius: 12, backgroundColor: '#bfefbd', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  premiumCardTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#31332c' },
  premiumCardSub:   { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73', lineHeight: 16 },
});
