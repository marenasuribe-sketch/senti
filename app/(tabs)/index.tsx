import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

const GOTAS_POR_ETAPA = 5;
const MAX_ETAPAS = 5;

const PLANTAS = [
  {
    id: 'bambu',   nombre: 'Bambú',   emoji: '🎋', personalidad: 'Resiliente',
    iconBg: '#e8f2e8', color: '#3d6841',
    mensaje: 'Como el bambú, tienes algo especial: te doblas sin romperte. Esa flexibilidad no es debilidad — es tu mayor fortaleza. Tu constancia es lo que te hace crecer.',
  },
  {
    id: 'girasol', nombre: 'Girasol', emoji: '🌻', personalidad: 'Optimista',
    iconBg: '#fef3e2', color: '#8a5010',
    mensaje: 'Tu naturaleza optimista ilumina todo lo que tocas. Aunque el día esté nublado, tú siempre buscas la luz — y la encuentras. Eso es un regalo tuyo.',
  },
  {
    id: 'lavanda', nombre: 'Lavanda', emoji: '🪻', personalidad: 'Introspectiva',
    iconBg: '#f0ebf8', color: '#5a4a8a',
    mensaje: 'Tu mundo interior es rico y profundo. Tienes el don de calmar lo que a otros agita — incluso a ti mismo. Esa tranquilidad tuya es genuina y valiosa.',
  },
  {
    id: 'cactus',  nombre: 'Cactus',  emoji: '🌵', personalidad: 'Independiente',
    iconBg: '#e8f4ec', color: '#3d6841',
    mensaje: 'No necesitas de todo para florecer. Tu independencia es tu escudo y tu libertad. Floreces cuando nadie lo espera — y eso te hace única.',
  },
  {
    id: 'helecho', nombre: 'Helecho', emoji: '🌿', personalidad: 'Empático',
    iconBg: '#e6f0e6', color: '#3a6030',
    mensaje: 'Creces desde lugares difíciles con una gracia silenciosa. Tu empatía te permite ver a los demás de verdad y sentirte a ti misma con honestidad.',
  },
];

const CONFETTI = [
  { top: 80,  left: '8%'  as any, color: '#C4A86A', size: 14 },
  { top: 110, left: '82%' as any, color: '#8AB88A', size: 12 },
  { top: 210, left: '4%'  as any, color: '#C4886A', size: 10 },
  { top: 570, left: '76%' as any, color: '#C4A86A', size: 14 },
  { top: 630, left: '14%' as any, color: '#8AB88A', size: 12 },
];

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const router = useRouter();
  const [userId, setUserId]       = useState<string | null>(null);
  const [plantaId, setPlantaId]   = useState<string | null>(null);
  const [gotas, setGotas]         = useState(0);
  const [cargando, setCargando]   = useState(true);
  const [celebrando, setCelebrando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { setCargando(false); return; }
        const uid = session.user.id;
        setUserId(uid);
        supabase
          .from('plantas_usuario')
          .select('nombre, puntos, nivel')
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.nombre) setPlantaId(data.nombre);
            if (data?.puntos != null) setGotas(data.puntos);
          })
          .finally(() => setCargando(false));
      });
    }, [])
  );

  async function regar() {
    if (!userId) return;
    const nuevas = gotas + 1;
    setGotas(nuevas);
    if (nuevas % GOTAS_POR_ETAPA === 0) setCelebrando(true);
    supabase.from('plantas_usuario')
      .update({ puntos: nuevas })
      .eq('user_id', userId);
  }

  const planta             = PLANTAS.find(p => p.id === plantaId);
  const etapa              = planta ? Math.min(Math.floor(gotas / GOTAS_POR_ETAPA) + 1, MAX_ETAPAS) : 1;
  const gotasParaSiguiente = etapa < MAX_ETAPAS ? etapa * GOTAS_POR_ETAPA - gotas : 0;

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3d6841" />
      </View>
    );
  }

  if (!planta) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 72, marginBottom: 16 }}>🌱</Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: '#31332c', textAlign: 'center', marginBottom: 8 }}>
          Todavía no tienes una planta
        </Text>
        <Text style={{ fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Elige tu compañera de bienestar para empezar a cuidarla.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 32 }}
          onPress={() => router.push('/onboarding/planta')}
          activeOpacity={0.85}
        >
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0' }}>
            Elegir mi planta 🌿
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f4' }}>
      <ScrollView contentContainerStyle={S.jardContent}>
        <View style={S.topBar}>
          <View style={S.logoRow}>
            <Text style={S.logoEmoji}>🌿</Text>
            <Text style={S.logoText}>Senti</Text>
          </View>
          <Text style={S.subtitle}>{greetingLabel()}, esto es tuyo</Text>
        </View>

        <View style={S.jardSection}>

          {/* Card planta principal */}
          <View style={[S.plantaCard, { backgroundColor: planta.iconBg }]}>
            <Text style={S.plantaEmoji}>{planta.emoji}</Text>
            <Text style={[S.plantaNombre, { color: planta.color }]}>{planta.nombre}</Text>
            <Text style={S.plantaPersonalidad}>{planta.personalidad}</Text>

            <View style={S.etapasRow}>
              {Array.from({ length: MAX_ETAPAS }).map((_, i) => (
                <View key={i} style={[S.etapaDot, i < etapa && { backgroundColor: planta.color }]} />
              ))}
            </View>
            <Text style={S.etapaLabel}>
              {gotasParaSiguiente > 0
                ? `${gotasParaSiguiente} gotitas más para crecer ✨`
                : '¡Llegaste al máximo — qué constancia! 🌟'}
            </Text>
          </View>

          {/* Card mensaje de personalidad */}
          <View style={[S.mensajeCard, { borderLeftColor: planta.color }]}>
            <Text style={[S.mensajeTitulo, { color: planta.color }]}>{planta.personalidad}</Text>
            <Text style={S.mensajeTexto}>{planta.mensaje}</Text>
          </View>

          {/* Card gotas */}
          <View style={S.gotasCard}>
            <Text style={S.gotasEmoji}>💧</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.gotasNum}>{gotas}</Text>
              <Text style={S.gotasLbl}>riegos totales</Text>
            </View>
            {gotasParaSiguiente > 0 && (
              <Text style={S.gotasHint}>{gotasParaSiguiente} para{'\n'}la etapa {etapa + 1}</Text>
            )}
          </View>

          {/* Botón regar */}
          <TouchableOpacity style={S.btnRegar} onPress={regar} activeOpacity={0.85}>
            <Text style={S.btnRegarText}>+ Regar mi planta</Text>
          </TouchableOpacity>

          {/* Historial */}
          <Text style={S.secLabel}>Tu recorrido</Text>
          <View style={S.historialRow}>
            <View style={S.histCard}>
              <Text style={S.histEmoji}>💧</Text>
              <Text style={S.histNum}>{gotas}</Text>
              <Text style={S.histLbl}>riegos{'\n'}totales</Text>
            </View>
            <View style={S.histCard}>
              <Text style={S.histEmoji}>🌿</Text>
              <Text style={S.histNum}>{etapa}</Text>
              <Text style={S.histLbl}>etapa{'\n'}actual</Text>
            </View>
            <View style={S.histCard}>
              <Text style={S.histEmoji}>⭐</Text>
              <Text style={S.histNum}>{Math.floor(gotas / GOTAS_POR_ETAPA)}</Text>
              <Text style={S.histLbl}>etapas{'\n'}superadas</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Modal celebración ── */}
      <Modal visible={celebrando} transparent={false} animationType="fade" statusBarTranslucent>
        <View style={S.celebBg}>
          {CONFETTI.map((d, i) => (
            <View
              key={i}
              style={[S.confettiDot, {
                top: d.top, left: d.left,
                width: d.size, height: d.size,
                borderRadius: d.size / 2,
                backgroundColor: d.color,
              }]}
            />
          ))}

          <View style={S.celebCard}>
            <Text style={S.celebEmoji}>{planta.emoji}</Text>
            <Text style={S.celebTitle}>¡Tu planta creció gracias a tu constancia!</Text>
            <Text style={S.celebMensaje}>Gracias por cuidarla... y por cuidarte 🌱</Text>
            <Text style={S.celebSub}>
              Llevas {gotas} {gotas === 1 ? 'riego' : 'riegos'} — eso dice mucho de ti 💚
            </Text>

            <View style={S.celebEtapasWrap}>
              <Text style={S.celebEtapasTitulo}>Etapa {etapa} de {MAX_ETAPAS}</Text>
              <View style={S.celebEtapas}>
                {Array.from({ length: MAX_ETAPAS }).map((_, i) => (
                  <View key={i} style={[S.celebEtapaDot, i < etapa && S.celebEtapaDotActive]} />
                ))}
              </View>
              <Text style={S.celebHint}>
                {gotasParaSiguiente > 0
                  ? `Solo ${gotasParaSiguiente} gotitas más para la siguiente etapa — ¡tú puedes!`
                  : '¡Llegaste al máximo! Eres increíble 🌟'}
              </Text>
            </View>

            <TouchableOpacity style={S.celebBtn} onPress={() => setCelebrando(false)} activeOpacity={0.85}>
              <Text style={S.celebBtnText}>¡Seguir cuidándome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  topBar:              { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#e2e3d9' },
  logoRow:             { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji:           { fontSize: 18 },
  logoText:            { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c' },
  subtitle:            { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73', marginTop: 4 },
  secLabel:            { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },

  jardContent:         { paddingBottom: 32 },
  jardSection:         { padding: 14, paddingHorizontal: 24, gap: 12 },

  plantaCard:          { borderRadius: 24, padding: 28, alignItems: 'center', gap: 4 },
  plantaEmoji:         { fontSize: 80 },
  plantaNombre:        { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, marginTop: 6 },
  plantaPersonalidad:  { fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#5e6058' },
  etapasRow:           { flexDirection: 'row', gap: 6, marginTop: 16 },
  etapaDot:            { width: 28, height: 4, borderRadius: 2, backgroundColor: '#e2e3d9' },
  etapaLabel:          { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#5e6058', marginTop: 6, textAlign: 'center' },

  mensajeCard:         { backgroundColor: '#ffffff', borderLeftWidth: 3, borderRadius: 12, borderTopLeftRadius: 0, padding: 16, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 24 },
  mensajeTitulo:       { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' },
  mensajeTexto:        { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', lineHeight: 20 },

  gotasCard:           { backgroundColor: '#efeee6', borderRadius: 12, padding: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  gotasEmoji:          { fontSize: 30 },
  gotasNum:            { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, color: '#31332c' },
  gotasLbl:            { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#5e6058', marginTop: 1 },
  gotasHint:           { fontFamily: 'Manrope_400Regular', fontSize: 10, color: '#5e6058', textAlign: 'right', lineHeight: 15 },

  btnRegar:            { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  btnRegarText:        { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },

  historialRow:        { flexDirection: 'row', gap: 10, marginBottom: 8 },
  histCard:            { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 24 },
  histEmoji:           { fontSize: 22 },
  histNum:             { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: '#31332c' },
  histLbl:             { fontFamily: 'Manrope_400Regular', fontSize: 10, color: '#797c73', textAlign: 'center', lineHeight: 14 },

  celebBg:             { flex: 1, backgroundColor: '#bfefbd', justifyContent: 'center', alignItems: 'center' },
  confettiDot:         { position: 'absolute', opacity: 0.8 },
  celebCard:           { backgroundColor: '#ffffff', borderRadius: 24, padding: 28, alignItems: 'center', width: '86%', shadowColor: 'rgba(103,94,77,1)', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10, gap: 4 },
  celebEmoji:          { fontSize: 72, marginBottom: 4 },
  celebTitle:          { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', textAlign: 'center', lineHeight: 26 },
  celebMensaje:        { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#3d6841', textAlign: 'center', lineHeight: 21 },
  celebSub:            { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#5e6058', textAlign: 'center', marginTop: 2 },
  celebEtapasWrap:     { width: '100%', backgroundColor: '#f5f4ed', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, marginTop: 12 },
  celebEtapasTitulo:   { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: '#3d6841', letterSpacing: 0.3 },
  celebEtapas:         { flexDirection: 'row', gap: 6 },
  celebEtapaDot:       { width: 28, height: 5, borderRadius: 3, backgroundColor: '#e2e3d9' },
  celebEtapaDotActive: { backgroundColor: '#3d6841' },
  celebHint:           { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#5e6058', textAlign: 'center', lineHeight: 17 },
  celebBtn:            { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 36, marginTop: 8 },
  celebBtnText:        { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },
});
