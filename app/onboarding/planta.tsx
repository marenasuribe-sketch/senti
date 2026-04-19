import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const PLANTAS = [
  {
    id: 'bambu',   nombre: 'Bambú',   emoji: '🎋', personalidad: 'Resiliente',
    descripcion: 'Flexible ante cualquier viento',
    iconBg: '#e8f2e8', color: '#3d6841',
    mensaje: 'Como el bambú, te doblas sin romperte. Esa flexibilidad no es debilidad — es tu mayor fortaleza.',
  },
  {
    id: 'girasol', nombre: 'Girasol', emoji: '🌻', personalidad: 'Optimista',
    descripcion: 'Siempre busca la luz',
    iconBg: '#fef3e2', color: '#8a5010',
    mensaje: 'Tu naturaleza optimista ilumina todo lo que tocas. Aunque el día esté nublado, tú encuentras la luz.',
  },
  {
    id: 'lavanda', nombre: 'Lavanda', emoji: '🪻', personalidad: 'Introspectiva',
    descripcion: 'Calma lo que agita',
    iconBg: '#f0ebf8', color: '#5a4a8a',
    mensaje: 'Tu mundo interior es rico y profundo. Tienes el don de calmar lo que a otros agita.',
  },
  {
    id: 'cactus',  nombre: 'Cactus',  emoji: '🌵', personalidad: 'Independiente',
    descripcion: 'Fuerte en terreno difícil',
    iconBg: '#e8f4ec', color: '#3d6841',
    mensaje: 'No necesitas de todo para florecer. Tu independencia es tu escudo y tu libertad.',
  },
  {
    id: 'helecho', nombre: 'Helecho', emoji: '🌿', personalidad: 'Empático',
    descripcion: 'Crece desde la sombra',
    iconBg: '#e6f0e6', color: '#3a6030',
    mensaje: 'Tu empatía te permite ver a los demás de verdad y sentirte a ti mismo con honestidad.',
  },
];

export default function PlantaOnboardingScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guardando, setGuardando]   = useState(false);

  const plantaSeleccionada = PLANTAS.find(p => p.id === selectedId);

  async function confirmar() {
    if (!selectedId) return;
    setGuardando(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Error', 'No hay sesión activa. Volvé a iniciar sesión.');
      setGuardando(false);
      return;
    }

    const { error } = await supabase.from('plantas_usuario').upsert(
      { user_id: session.user.id, nombre: selectedId, puntos: 0, nivel: 1 },
      { onConflict: 'user_id' },
    );

    if (error) {
      Alert.alert('Error al guardar', error.message);
      setGuardando(false);
      return;
    }

    await AsyncStorage.setItem('onboarding_complete', 'true');
    setGuardando(false);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={S.safe}>

      {/* Header fijo */}
      <View style={S.header}>
        <Text style={S.eyebrow}>Último paso</Text>
        <Text style={S.titulo}>Elige tu planta</Text>
        <Text style={S.subtitulo}>
          Te acompañará mientras cuidas tu bienestar.{'\n'}
          Esta elección es tuya para siempre.
        </Text>
      </View>

      {/* Lista de plantas */}
      <ScrollView
        contentContainerStyle={S.lista}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {PLANTAS.map((p) => {
          const sel = selectedId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[S.card, sel && S.cardActivo]}
              onPress={() => setSelectedId(p.id)}
              activeOpacity={0.8}
            >
              <View style={[S.iconBg, { backgroundColor: p.iconBg }]}>
                <Text style={S.emoji}>{p.emoji}</Text>
              </View>

              <View style={S.info}>
                <Text style={S.nombre}>{p.nombre}</Text>
                <Text style={[S.personalidad, { color: p.color }]}>{p.personalidad}</Text>
                <Text style={S.desc}>{p.descripcion}</Text>
              </View>

              <View style={[S.radio, sel && S.radioActivo]}>
                {sel && <View style={S.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Mensaje de la planta seleccionada */}
        {plantaSeleccionada && (
          <View style={[S.mensajeCard, { borderLeftColor: plantaSeleccionada.color }]}>
            <Text style={[S.mensajeTitulo, { color: plantaSeleccionada.color }]}>
              {plantaSeleccionada.personalidad}
            </Text>
            <Text style={S.mensajeTexto}>{plantaSeleccionada.mensaje}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer fijo */}
      <View style={S.footer}>
        <TouchableOpacity
          style={[S.btnConfirmar, (!selectedId || guardando) && S.btnDisabled]}
          onPress={confirmar}
          disabled={!selectedId || guardando}
          activeOpacity={0.85}
        >
          {guardando
            ? <ActivityIndicator color="#e4ffe0" />
            : <Text style={S.btnConfirmarText}>
                {plantaSeleccionada
                  ? `Empezar con ${plantaSeleccionada.nombre} ${plantaSeleccionada.emoji}`
                  : 'Elegir planta'}
              </Text>
          }
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fbf9f4' },

  header:         { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 6 },
  eyebrow:        { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, textTransform: 'uppercase' },
  titulo:         { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, color: '#31332c' },
  subtitulo:      { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', lineHeight: 22 },

  lista:          { paddingHorizontal: 24, paddingTop: 8, gap: 12 },

  card:           {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#f5f4ed', borderRadius: 12,
    padding: 16,
  },
  cardActivo:     { backgroundColor: '#ffffff', shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3 },
  iconBg:         { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  emoji:          { fontSize: 30 },

  info:           { flex: 1, gap: 2 },
  nombre:         { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#31332c' },
  personalidad:   { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  desc:           { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#797c73' },

  radio:          { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#b1b3a9', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  radioActivo:    { borderColor: '#3d6841' },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3d6841' },

  mensajeCard:    { backgroundColor: '#ffffff', borderLeftWidth: 3, borderRadius: 12, borderTopLeftRadius: 0, borderBottomLeftRadius: 12, padding: 16, marginTop: 4 },
  mensajeTitulo:  { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  mensajeTexto:   { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', lineHeight: 22 },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36, backgroundColor: 'rgba(251,249,244,0.96)' },
  btnConfirmar:   { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  btnDisabled:    { opacity: 0.4 },
  btnConfirmarText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0' },
});
