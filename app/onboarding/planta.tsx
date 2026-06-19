import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { PLANTAS_PREMIUM } from '../../lib/planta';
import { usePremium } from '../../hooks/usePremium';
import AvisoSenti, { AvisoConfig } from '../../components/AvisoSenti';

const PLANTAS = [
  {
    id: 'bambu',    nombre: 'Bambú',    emoji: '🎋', personalidad: 'Resiliente',
    descripcion: 'Flexible ante cualquier viento.',
    glow: '#bfefbd', accent: '#3d6841',
    mensaje: 'Como el bambú, te doblas sin romperte. Esa flexibilidad no es debilidad — es tu mayor fortaleza.',
  },
  {
    id: 'girasol',  nombre: 'Girasol',  emoji: '🌻', personalidad: 'Optimista',
    descripcion: 'Siempre busca la luz.',
    glow: '#fef3e2', accent: '#8a5010',
    mensaje: 'Tu naturaleza optimista ilumina todo lo que tocas. Aunque el día esté nublado, tú encuentras la luz.',
  },
  {
    id: 'lavanda',  nombre: 'Lavanda',  emoji: '🪻', personalidad: 'Introspectiva',
    descripcion: 'Calma lo que agita.',
    glow: '#f0ebf8', accent: '#5a4a8a',
    mensaje: 'Tu mundo interior es rico y profundo. Tienes el don de calmar lo que a otros agita.',
  },
  {
    id: 'cactus',   nombre: 'Cactus',   emoji: '🌵', personalidad: 'Independiente',
    descripcion: 'Fuerte en terreno difícil.',
    glow: '#e8f4ec', accent: '#3d6841',
    mensaje: 'No necesitas de todo para florecer. Tu independencia es tu escudo y tu libertad.',
  },
  {
    id: 'helecho',  nombre: 'Helecho',  emoji: '🌿', personalidad: 'Empático',
    descripcion: 'Crece desde la sombra.',
    glow: '#e6f0e6', accent: '#3a6030',
    mensaje: 'Tu empatía te permite ver a los demás de verdad y sentirte a ti misma con honestidad.',
  },
  // Senti+ exclusivas
  {
    id: 'rosal',       nombre: 'Rosal',       emoji: '🌹', personalidad: 'Apasionada',
    descripcion: 'Belleza con espinas propias.',
    glow: '#fce4ec', accent: '#c2185b',
    mensaje: 'Amas con intensidad y lo sientes todo. Esa profundidad es tu mayor regalo.',
  },
  {
    id: 'cedro',       nombre: 'Cedro',       emoji: '🌲', personalidad: 'Arraigada',
    descripcion: 'Raíces profundas, altura real.',
    glow: '#dcedc8', accent: '#2e7d32',
    mensaje: 'Tu solidez viene de dentro. Cuando tú estás bien, todos a tu alrededor lo notan.',
  },
  {
    id: 'magnolia',    nombre: 'Magnolia',    emoji: '🌸', personalidad: 'Serena',
    descripcion: 'Florece antes que los demás.',
    glow: '#f8bbd0', accent: '#ad1457',
    mensaje: 'Encuentras paz donde otros ven caos. Tu serenidad es una fortaleza silenciosa.',
  },
  {
    id: 'orquidea',    nombre: 'Orquídea',    emoji: '🪷', personalidad: 'Sofisticada',
    descripcion: 'Profundidad que no todos ven.',
    glow: '#f3e5f5', accent: '#7b1fa2',
    mensaje: 'Tienes una profundidad que no todos alcanzan a ver. Tu elegancia es silenciosa y real.',
  },
  {
    id: 'tulipan',     nombre: 'Tulipán',     emoji: '🌷', personalidad: 'Alegre',
    descripcion: 'Celebra lo pequeño.',
    glow: '#ffeef2', accent: '#c62828',
    mensaje: 'Encuentras razones para celebrar donde otros no miran. Tu alegría ilumina lo ordinario.',
  },
  {
    id: 'peonia',      nombre: 'Peonía',      emoji: '🌺', personalidad: 'Sensible',
    descripcion: 'Siente profundo, vive plena.',
    glow: '#fce4ec', accent: '#880e4f',
    mensaje: 'Sentir profundo no es debilidad — es tu forma de conectar con lo que realmente importa.',
  },
  {
    id: 'dalia',       nombre: 'Dalia',       emoji: '🌼', personalidad: 'Curiosa',
    descripcion: 'Siempre busca el siguiente por qué.',
    glow: '#fffde7', accent: '#f57f17',
    mensaje: 'Tu mente nunca se cansa de preguntar. Esa curiosidad te lleva siempre más lejos.',
  },
  {
    id: 'palma',       nombre: 'Palma',       emoji: '🌴', personalidad: 'Libre',
    descripcion: 'Necesita espacio para crecer.',
    glow: '#e0f7fa', accent: '#00695c',
    mensaje: 'Necesitas espacio para ser tú misma y eso está completamente bien. Tu libertad es tu verdad.',
  },
  {
    id: 'nomeolvides', nombre: 'Nomeolvides', emoji: '💐', personalidad: 'Fiel',
    descripcion: 'Presente cuando más importa.',
    glow: '#e8eaf6', accent: '#3949ab',
    mensaje: 'Estás cuando importa. Tu lealtad construye mundos más seguros para todos a tu alrededor.',
  },
  {
    id: 'trebol',      nombre: 'Trébol',      emoji: '🍀', personalidad: 'Esperanzada',
    descripcion: 'Siempre encuentra el ángulo de luz.',
    glow: '#e8f5e9', accent: '#1b5e20',
    mensaje: 'Siempre encuentras el ángulo de la esperanza. En tiempos difíciles, eso es extraordinario.',
  },
  {
    id: 'coral',       nombre: 'Coral',       emoji: '🪸', personalidad: 'Tenaz',
    descripcion: 'Construye desde adentro, sin prisa.',
    glow: '#fff3e0', accent: '#bf360c',
    mensaje: 'Construyes desde adentro, poco a poco, sin que nadie lo vea. Eso requiere una fuerza real.',
  },
  {
    id: 'trigo',       nombre: 'Trigo',       emoji: '🌾', personalidad: 'Paciente',
    descripcion: 'Sabe que todo tiene su tiempo.',
    glow: '#fff8e1', accent: '#e65100',
    mensaje: 'Sabes que todo tiene su tiempo. Tu paciencia no es pasividad — es la sabiduría más honesta.',
  },
  {
    id: 'sabila',      nombre: 'Sábila',      emoji: '🌱', personalidad: 'Sanadora',
    descripcion: 'Tiene el don de hacer sentir mejor.',
    glow: '#e8f5e9', accent: '#2e7d32',
    mensaje: 'Tienes el don natural de hacer que los demás se sientan mejor. No olvides también sanarte a ti.',
  },
];

export default function PlantaOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { esPremium } = usePremium();
  const [idx, setIdx] = useState(0);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [guardando, setGuardando]   = useState(false);
  const [aviso, setAviso]           = useState<AvisoConfig | null>(null);

  const planta = PLANTAS[idx];
  const seleccionada = confirmado === planta.id;
  const esPremiumPlanta = PLANTAS_PREMIUM.has(planta.id);
  const bloqueada = esPremiumPlanta && !esPremium;

  function prev() { setIdx(i => (i === 0 ? PLANTAS.length - 1 : i - 1)); }
  function next() { setIdx(i => (i === PLANTAS.length - 1 ? 0 : i + 1)); }

  async function confirmar() {
    if (!confirmado) return;
    setGuardando(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAviso({ titulo: 'No hay sesión activa', mensaje: 'Vuelve a iniciar sesión para elegir tu planta.', icono: 'alert-circle-outline' });
      setGuardando(false);
      return;
    }

    const { error } = await supabase.from('plantas_usuario').upsert(
      { user_id: session.user.id, nombre: confirmado, puntos: 0, nivel: 1 },
      { onConflict: 'user_id' },
    );

    if (error) {
      setAviso({ titulo: 'No se pudo guardar', mensaje: error.message, icono: 'alert-circle-outline' });
      setGuardando(false);
      return;
    }

    await AsyncStorage.setItem('onboarding_complete', 'true');
    setGuardando(false);
    router.replace('/(tabs)');
  }

  return (
    <View style={[S.safe, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={S.container}>

        {/* Header */}
        <View style={S.header}>
          <Text style={S.eyebrow}>ÚLTIMO PASO</Text>
          <Text style={S.titulo}>Elige tu compañera.</Text>
          <Text style={S.subtitulo}>
            Te acompañará mientras cuidas tu bienestar. Esta elección es tuya para siempre.
          </Text>
        </View>

        {/* Carrusel de plantas */}
        <View style={S.carrusel}>

          <View style={S.plantaShow}>
            <View style={[S.glow, { backgroundColor: planta.glow, opacity: bloqueada ? 0.3 : 0.55 }]} />
            <Text style={[S.plantaEmoji, bloqueada && { opacity: 0.4 }]}>{planta.emoji}</Text>
            {bloqueada && (
              <View style={S.lockBadge}>
                <Ionicons name="lock-closed" size={18} color="#fff" />
                <Text style={S.lockBadgeText}>SENTI+</Text>
              </View>
            )}
          </View>

          {/* Info de la planta */}
          <View style={S.info}>
            <Text style={[S.personalidad, { color: planta.accent }]}>
              {planta.personalidad.toUpperCase()}
            </Text>
            <Text style={S.nombre}>{planta.nombre}</Text>
            <Text style={S.descripcion}>{planta.descripcion}</Text>
            <Text style={S.mensaje}>"{planta.mensaje}"</Text>
          </View>

          {/* Controles del carrusel */}
          <View style={S.controles}>
            <TouchableOpacity style={S.arrowBtn} onPress={prev} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color="#31332c" />
            </TouchableOpacity>

            <View style={S.dots}>
              {PLANTAS.map((_, i) => (
                <View key={i} style={[S.dot, i === idx && S.dotActive]} />
              ))}
            </View>

            <TouchableOpacity style={S.arrowBtn} onPress={next} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color="#31332c" />
            </TouchableOpacity>
          </View>

        </View>

        {/* Footer con 2 botones */}
        <View style={S.footer}>
          {seleccionada ? (
            <TouchableOpacity
              style={S.btnConfirmar}
              onPress={confirmar}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando
                ? <ActivityIndicator color="#e4ffe0" />
                : (
                  <>
                    <Text style={S.btnConfirmarText}>Empezar con {planta.nombre}</Text>
                    <Text style={S.btnConfirmarEmoji}>{planta.emoji}</Text>
                  </>
                )
              }
            </TouchableOpacity>
          ) : bloqueada ? (
            <TouchableOpacity
              style={S.btnPremium}
              onPress={() => router.push('/upgrade')}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed" size={16} color="#675e4d" />
              <Text style={S.btnPremiumText}>Desbloquear con Senti+</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={S.btnElegir}
              onPress={() => setConfirmado(planta.id)}
              activeOpacity={0.85}
            >
              <Text style={S.btnElegirText}>Esta es mi planta</Text>
            </TouchableOpacity>
          )}

          {seleccionada && (
            <TouchableOpacity onPress={() => setConfirmado(null)} activeOpacity={0.7}>
              <Text style={S.btnCambiar}>Cambiar selección</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
      <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
    </View>
  );
}

const S = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fbf9f4' },
  container:      { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },

  header:         { gap: 8 },
  eyebrow:        { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.8 },
  titulo:         { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#31332c', letterSpacing: -0.8, lineHeight: 42 },
  subtitulo:      { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', lineHeight: 22, marginTop: 4 },

  carrusel:       { flex: 1, marginTop: 24, alignItems: 'center', justifyContent: 'center' },

  plantaShow:     { alignItems: 'center', justifyContent: 'center', height: 200 },
  glow:           { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.55 },
  plantaEmoji:    { fontSize: 130 },

  info:           { alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 16 },
  personalidad:   { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.8 },
  nombre:         { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: '#31332c', letterSpacing: -0.8 },
  descripcion:    { fontFamily: 'Manrope_500Medium', fontSize: 14, color: '#5e6058', textAlign: 'center' },
  mensaje:        { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#31332c', textAlign: 'center', lineHeight: 22, fontStyle: 'italic', marginTop: 12, paddingHorizontal: 8 },

  controles:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 28 },
  arrowBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f4ed', alignItems: 'center', justifyContent: 'center' },
  dots:           { flexDirection: 'row', gap: 6 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e2e3d9' },
  dotActive:      { width: 24, backgroundColor: '#3d6841' },

  footer:         { gap: 12, marginTop: 16 },
  btnElegir:      { backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  btnElegirText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#3d6841' },
  btnConfirmar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16 },
  btnConfirmarText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },
  btnConfirmarEmoji:{ fontSize: 18 },
  btnCambiar:     { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#797c73', textAlign: 'center' },

  btnPremium:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eee1cc', borderRadius: 9999, paddingVertical: 16 },
  btnPremiumText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#675e4d' },

  lockBadge:      { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 12 },
  lockBadgeText:  { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1.2 },
});
