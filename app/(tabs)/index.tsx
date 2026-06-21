import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import SentiLogo from '../../components/SentiLogo';
import {
  GOTAS_POR_ETAPA, MAX_ETAPAS, PLANTAS_INFO,
  etapaPara, emojiEtapa, labelEtapa,
  obtenerEstacion, ESTACIONES,
} from '../../lib/planta';
import { usePremium } from '../../hooks/usePremium';
import {
  obtenerCapsulaLista, obtenerCapsulaActiva, formatearFecha, diasRestantes,
  type Capsula,
} from '../../lib/capsulas';

// Mensajes de personalidad por planta — viven aquí porque son específicos del Home
const MENSAJES_PERSONALIDAD: Record<string, { personalidad: string; mensaje: string }> = {
  bambu:   { personalidad: 'Resiliente',     mensaje: 'Como el bambú, te doblas sin romperte. Esa flexibilidad no es debilidad — es tu mayor fortaleza. Tu constancia es lo que te hace crecer.' },
  girasol: { personalidad: 'Optimista',      mensaje: 'Tu naturaleza optimista ilumina todo lo que tocas. Aunque el día esté nublado, tú siempre buscas la luz — y la encuentras.' },
  lavanda: { personalidad: 'Introspectiva',  mensaje: 'Tu mundo interior es rico y profundo. Tienes el don de calmar lo que a otros agita — incluso a ti misma.' },
  cactus:  { personalidad: 'Independiente',  mensaje: 'Como el cactus, guardas tu energía para cuando más importa. No necesitas aprobación para avanzar — floreces en tus propios términos.' },
  helecho: { personalidad: 'Empático',       mensaje: 'Creces desde lugares difíciles con una gracia silenciosa. Tu empatía te permite ver a los demás de verdad.' },
};

const ETAPA_SUB = [
  'Apenas comienza.',
  'Echando raíces.',
  'Creciendo con intención.',
  'A punto de florecer.',
  'En su plenitud.',
];

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const router = useRouter();
  const { esPremium } = usePremium();
  const [userId, setUserId]       = useState<string | null>(null);
  const [plantaId, setPlantaId]   = useState<string | null>(null);
  const [gotas, setGotas]         = useState(0);
  const [cargando, setCargando]   = useState(true);
  const [capsulaLista, setCapsulaLista]   = useState<Capsula | null>(null);
  const [capsulaActiva, setCapsulaActiva] = useState<Capsula | null>(null);
  const estacion = obtenerEstacion();
  const estacionInfo = ESTACIONES[estacion];

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setCargando(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (!cancelled) setCargando(false); return; }
        const uid = session.user.id;
        if (!cancelled) setUserId(uid);
        const { data } = await supabase
          .from('plantas_usuario')
          .select('nombre, puntos, nivel')
          .eq('user_id', uid)
          .maybeSingle();
        if (cancelled) return;
        if (data?.nombre) setPlantaId(data.nombre);
        if (data?.puntos != null) setGotas(data.puntos);

        // Verificar cápsulas
        const [lista, activa] = await Promise.all([
          obtenerCapsulaLista(supabase, uid),
          obtenerCapsulaActiva(supabase, uid),
        ]);
        if (!cancelled) {
          setCapsulaLista(lista);
          setCapsulaActiva(lista ? null : activa); // si hay una lista, la activa no importa
        }
        setCargando(false);
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const planta             = plantaId ? PLANTAS_INFO[plantaId] : null;
  const personalidad       = plantaId ? MENSAJES_PERSONALIDAD[plantaId] : null;
  const etapa              = planta ? etapaPara(gotas) : 1;
  const gotasParaSiguiente = etapa < MAX_ETAPAS ? etapa * GOTAS_POR_ETAPA - gotas : 0;
  const etapasSuperadas    = Math.floor(gotas / GOTAS_POR_ETAPA);
  const emojiActual        = emojiEtapa(etapa, plantaId);

  if (cargando) {
    return (
      <View style={S.cargandoBg}>
        <ActivityIndicator color="#3d6841" />
      </View>
    );
  }

  // Sin planta — onboarding sugerido
  if (!planta) {
    return (
      <View style={S.emptyBg}>
        <Text style={S.emptyEmoji}>🌱</Text>
        <Text style={S.emptyTitle}>Todavía no tienes una planta</Text>
        <Text style={S.emptySub}>Elige tu compañera de bienestar para empezar a cuidarla.</Text>
        <TouchableOpacity
          style={S.emptyBtn}
          onPress={() => router.push('/onboarding/planta')}
          activeOpacity={0.85}
        >
          <Text style={S.emptyBtnText}>Elegir mi planta</Text>
          <Ionicons name="arrow-forward" size={16} color="#e4ffe0" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <ScrollView contentContainerStyle={S.content}>

        {/* TopBar */}
        <View style={S.topBar}>
          <View style={S.logoRow}>
            <SentiLogo size={22} />
            <Text style={S.logoText}>Senti</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#5e6058" />
          </TouchableOpacity>
        </View>

        {/* Hero centrado */}
        <View style={S.hero}>
          <Text style={S.heroLabel}>{greetingLabel().toUpperCase()}</Text>
          <Text style={S.heroTitle}>{planta.nombre}</Text>
          <Text style={S.heroSub}>{ETAPA_SUB[etapa - 1]}</Text>
        </View>

        {/* Planta con glow — emoji evoluciona por etapa */}
        <View style={S.plantaWrap}>
          <View style={[S.glow, { backgroundColor: planta.glow }]} />
          {esPremium && (
            <View style={[S.glowEstacion, { backgroundColor: estacionInfo.glowExtra }]} />
          )}
          <Text style={S.plantaEmoji}>{emojiActual}</Text>
          {esPremium && (
            <View style={S.estacionBadge}>
              <Text style={S.estacionEmoji}>{estacionInfo.emoji}</Text>
            </View>
          )}
        </View>

        {/* Estación — solo premium */}
        {esPremium && (
          <View style={S.estacionRow}>
            <Text style={S.estacionLabel}>{estacionInfo.nombre.toUpperCase()}</Text>
            <Text style={S.estacionMensaje}>{estacionInfo.mensaje}</Text>
          </View>
        )}

        {/* Etapa progress */}
        <View style={S.etapaWrap}>
          <Text style={[S.etapaLabel, { color: planta.accent }]}>{labelEtapa(etapa)}</Text>
          <View style={S.etapasRow}>
            {Array.from({ length: MAX_ETAPAS }).map((_, i) => (
              <View
                key={i}
                style={[S.etapaDot, i < etapa && { backgroundColor: planta.accent }]}
              />
            ))}
          </View>
          <Text style={S.etapaSub}>
            {gotasParaSiguiente > 0
              ? `${gotasParaSiguiente} ${gotasParaSiguiente === 1 ? 'gotita' : 'gotitas'} más para crecer ✨`
              : 'Llegaste a su plenitud. Qué constancia. 🌟'}
          </Text>
        </View>

        {/* Card cápsula del tiempo */}
        {capsulaLista ? (
          // Hay una cápsula lista para abrir
          <TouchableOpacity
            style={S.capsulaListaCard}
            onPress={() => router.push({
              pathname: '/capsula-apertura' as any,
              params: {
                id: capsulaLista.id,
                texto: capsulaLista.texto,
                fecha_creacion: capsulaLista.created_at,
              },
            })}
            activeOpacity={0.85}
          >
            <Text style={S.capsulaListaEmoji}>📮</Text>
            <View style={S.capsulaListaTexts}>
              <Text style={S.capsulaListaLabel}>TU CÁPSULA ESTÁ LISTA</Text>
              <Text style={S.capsulaListaTitulo}>Te escribiste el {formatearFecha(capsulaLista.created_at)}</Text>
              <Text style={S.capsulaListaSub}>Toca para abrir</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#1e4824" />
          </TouchableOpacity>
        ) : capsulaActiva ? (
          // Hay una cápsula activa esperando
          <View style={S.capsulaActivaCard}>
            <Text style={S.capsulaActivaEmoji}>📮</Text>
            <View style={S.capsulaActivaTexts}>
              <Text style={S.capsulaActivaLabel}>CÁPSULA SELLADA</Text>
              <Text style={S.capsulaActivaTitulo}>Se abre el {formatearFecha(capsulaActiva.fecha_apertura)}</Text>
              <Text style={S.capsulaActivaSub}>{diasRestantes(capsulaActiva.fecha_apertura)} días restantes</Text>
            </View>
          </View>
        ) : (
          // No hay cápsula — invitar a crear
          <TouchableOpacity
            style={S.capsulaVaciaCard}
            onPress={() => router.push('/capsula-nueva' as any)}
            activeOpacity={0.85}
          >
            <Text style={S.capsulaVaciaEmoji}>📮</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={S.capsulaVaciaTitulo}>Escríbete una carta al futuro</Text>
              <Text style={S.capsulaVaciaSub}>Tu yo de aquí a 6 meses te lo agradecerá.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#797c73" />
          </TouchableOpacity>
        )}

        {/* Card focus con stats */}
        <View style={S.focusCard}>
          <View style={S.statsRow}>
            <View style={S.statBox}>
              <View style={[S.statIcon, { backgroundColor: '#bfefbd' }]}>
                <Ionicons name="water" size={20} color="#3d6841" />
              </View>
              <Text style={S.statNum}>{gotas}</Text>
              <Text style={S.statLbl}>GOTAS RECIBIDAS</Text>
            </View>

            <View style={S.statDivider} />

            <View style={S.statBox}>
              <View style={[S.statIcon, { backgroundColor: '#eee1cc' }]}>
                <Ionicons name="trophy" size={18} color="#675e4d" />
              </View>
              <Text style={S.statNum}>{etapasSuperadas}</Text>
              <Text style={S.statLbl}>ETAPAS SUPERADAS</Text>
            </View>
          </View>
        </View>

        {/* Card cuidado — explica cómo crece + accesos */}
        <View style={S.cuidadoCard}>
          <Text style={S.cuidadoLabel}>CÓMO CRECE</Text>
          <Text style={S.cuidadoTitulo}>Tu planta recibe una gota cada vez que vuelves a ti.</Text>

          <View style={S.cuidadoAcciones}>
            <TouchableOpacity
              style={S.accionRow}
              onPress={() => router.push('/(tabs)/journal')}
              activeOpacity={0.7}
            >
              <View style={[S.accionIcon, { backgroundColor: '#bfefbd' }]}>
                <Ionicons name="journal-outline" size={16} color="#3d6841" />
              </View>
              <Text style={S.accionText}>Escribe en el Diario</Text>
              <Ionicons name="chevron-forward" size={16} color="#797c73" />
            </TouchableOpacity>

            <TouchableOpacity
              style={S.accionRow}
              onPress={() => router.push('/(tabs)/gratitud')}
              activeOpacity={0.7}
            >
              <View style={[S.accionIcon, { backgroundColor: '#bfefbd' }]}>
                <Ionicons name="heart-outline" size={16} color="#3d6841" />
              </View>
              <Text style={S.accionText}>Anota tu Gratitud</Text>
              <Ionicons name="chevron-forward" size={16} color="#797c73" />
            </TouchableOpacity>

            <TouchableOpacity
              style={S.accionRow}
              onPress={() => router.push('/(tabs)/descarga')}
              activeOpacity={0.7}
            >
              <View style={[S.accionIcon, { backgroundColor: '#bfefbd' }]}>
                <Ionicons name="leaf-outline" size={16} color="#3d6841" />
              </View>
              <Text style={S.accionText}>Suelta algo en Descarga</Text>
              <Ionicons name="chevron-forward" size={16} color="#797c73" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card mensaje de personalidad — editorial */}
        {personalidad && (
          <View style={S.mensajeCard}>
            <Text style={S.mensajeLabel}>{personalidad.personalidad.toUpperCase()}</Text>
            <Text style={S.mensajeText}>"{personalidad.mensaje}"</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },
  content:      { paddingBottom: 48 },

  cargandoBg:   { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' },

  emptyBg:      { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
  emptyEmoji:   { fontSize: 80 },
  emptyTitle:   { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: '#31332c', textAlign: 'center', letterSpacing: -0.6 },
  emptySub:     { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },

  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },

  hero:         { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24, gap: 4 },
  heroLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.8 },
  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 40, color: '#31332c', letterSpacing: -1, marginTop: 6 },
  heroSub:      { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', fontStyle: 'italic' },

  plantaWrap:   { alignItems: 'center', justifyContent: 'center', height: 240, marginTop: 12 },
  glow:         { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.6 },
  glowEstacion: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.4 },
  plantaEmoji:  { fontSize: 140 },
  estacionBadge:{ position: 'absolute', bottom: 12, right: '25%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estacionEmoji:{ fontSize: 18 },
  estacionRow:  { alignItems: 'center', gap: 4, marginTop: -12, marginBottom: 8, paddingHorizontal: 32 },
  estacionLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.8 },
  estacionMensaje:{ fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', textAlign: 'center', fontStyle: 'italic' },

  etapaWrap:    { alignItems: 'center', gap: 8, marginTop: -8, marginBottom: 24 },
  etapaLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.8 },
  etapasRow:    { flexDirection: 'row', gap: 6 },
  etapaDot:     { width: 36, height: 5, borderRadius: 3, backgroundColor: '#e2e3d9' },
  etapaSub:     { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', textAlign: 'center', marginTop: 2 },

  focusCard:    { marginHorizontal: 24, backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  statsRow:     { flexDirection: 'row', alignItems: 'center' },
  statBox:      { flex: 1, alignItems: 'center', gap: 6 },
  statIcon:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum:      { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#31332c', letterSpacing: -0.5 },
  statLbl:      { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.2, textAlign: 'center' },
  statDivider:  { width: 0.5, height: 64, backgroundColor: '#e2e3d9' },

  cuidadoCard:  { marginHorizontal: 24, marginTop: 16, backgroundColor: '#f5f4ed', borderRadius: 24, padding: 22, gap: 14 },
  cuidadoLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.8 },
  cuidadoTitulo:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: '#31332c', letterSpacing: -0.3, lineHeight: 26 },
  cuidadoAcciones:{ gap: 8, marginTop: 4 },
  accionRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  accionIcon:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accionText:   { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#31332c' },

  mensajeCard:  { marginHorizontal: 24, marginTop: 16, backgroundColor: '#bfefbd', borderRadius: 24, padding: 24, gap: 10 },
  mensajeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#3d6841', letterSpacing: 1.5 },
  mensajeText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: '#1e4824', lineHeight: 26, letterSpacing: -0.2, fontStyle: 'italic' },

  // Cápsula lista para abrir
  capsulaListaCard:  { marginHorizontal: 24, marginTop: 16, backgroundColor: '#3d6841', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  capsulaListaEmoji: { fontSize: 36 },
  capsulaListaTexts: { flex: 1, gap: 2 },
  capsulaListaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#bfefbd', letterSpacing: 1.5 },
  capsulaListaTitulo:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', lineHeight: 20 },
  capsulaListaSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#bfefbd', fontStyle: 'italic', marginTop: 2 },

  // Cápsula activa (esperando)
  capsulaActivaCard:  { marginHorizontal: 24, marginTop: 16, backgroundColor: '#eee1cc', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  capsulaActivaEmoji: { fontSize: 36 },
  capsulaActivaTexts: { flex: 1, gap: 2 },
  capsulaActivaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#675e4d', letterSpacing: 1.5 },
  capsulaActivaTitulo:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#31332c', lineHeight: 20 },
  capsulaActivaSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#675e4d', marginTop: 2 },

  // Sin cápsula
  capsulaVaciaCard:  { marginHorizontal: 24, marginTop: 16, backgroundColor: '#f5f4ed', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  capsulaVaciaEmoji: { fontSize: 32 },
  capsulaVaciaTitulo:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#31332c' },
  capsulaVaciaSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#5e6058', marginTop: 2 },
});
