import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { crearCapsula, calcularFechaApertura, OPCIONES_DURACION, formatearFecha } from '../lib/capsulas';
import { LIMITES_TEXTO, superaLimite } from '../lib/validation';
import { obtenerPerfil } from '../lib/premium';

export default function CapsulaNewScreen() {
  const router = useRouter();
  const [texto, setTexto]       = useState('');
  const [meses, setMeses]       = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fechaPreview = meses ? formatearFecha(calcularFechaApertura(meses).toISOString()) : null;

  async function handleSellar() {
    if (!texto.trim() || !meses) return;
    if (superaLimite(texto, 'capsula')) {
      Alert.alert('Carta demasiado larga', `Máximo ${LIMITES_TEXTO.capsula} caracteres.`);
      return;
    }
    setGuardando(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { Alert.alert('Error', 'No hay sesión activa.'); setGuardando(false); return; }

    const perfil = await obtenerPerfil(supabase, userId);
    const { error } = await crearCapsula(supabase, userId, texto.trim(), meses, perfil.es_premium);
    if (error === 'LIMITE_CAPSULAS_GRATIS') {
      Alert.alert(
        'Ya tienes una cápsula sellada',
        'El plan gratuito incluye 1 cápsula activa. Con Senti+ puedes tener hasta 6 al mismo tiempo.',
        [{ text: 'Cerrar', style: 'cancel' }, { text: 'Ver Senti+', onPress: () => router.push('/upgrade') }],
      );
      setGuardando(false);
      return;
    }
    if (error) {
      Alert.alert('No se pudo sellar', error);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    router.replace('/(tabs)');
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#5e6058" />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={S.hero}>
        <Text style={S.heroEmoji}>📮</Text>
        <Text style={S.heroTitle}>Escríbete{'\n'}una carta.</Text>
        <Text style={S.heroSub}>
          Tu yo del futuro la leerá cuando llegue el momento. Sin prisa. Sin juicios. Solo tú.
        </Text>
      </View>

      {/* Input carta */}
      <View style={S.cartaCard}>
        <Text style={S.cartaLabel}>TU CARTA</Text>
        <TextInput
          style={S.cartaInput}
          value={texto}
          onChangeText={setTexto}
          placeholder={'¿Cómo te sientes hoy?\n¿Qué esperas de ti misma?\n¿Qué te gustaría recordar?'}
          placeholderTextColor="#b1b3a9"
          multiline
          maxLength={LIMITES_TEXTO.capsula}
          textAlignVertical="top"
          editable={!guardando}
        />
      </View>

      {/* Selector de duración */}
      <View style={S.duracionBlock}>
        <Text style={S.duracionLabel}>¿CUÁNDO SE ABRE?</Text>
        <View style={S.duracionRow}>
          {OPCIONES_DURACION.map(op => (
            <TouchableOpacity
              key={op.meses}
              style={[S.duracionChip, meses === op.meses && S.duracionChipSel]}
              onPress={() => setMeses(op.meses)}
              activeOpacity={0.75}
            >
              <Text style={[S.duracionChipText, meses === op.meses && S.duracionChipTextSel]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {fechaPreview && (
          <Text style={S.fechaPreview}>Se abrirá el {fechaPreview}</Text>
        )}
      </View>

      {/* Botón sellar */}
      <TouchableOpacity
        style={[S.btnSellar, (!texto.trim() || !meses || guardando) && S.btnDisabled]}
        onPress={handleSellar}
        disabled={!texto.trim() || !meses || guardando}
        activeOpacity={0.85}
      >
        {guardando
          ? <ActivityIndicator color="#e4ffe0" />
          : (
            <>
              <Ionicons name="mail" size={18} color="#e4ffe0" />
              <Text style={S.btnSellarText}>Sellar cápsula</Text>
            </>
          )
        }
      </TouchableOpacity>

      <Text style={S.nota}>Una vez sellada no podrás editarla. Solo la leerás cuando llegue el momento.</Text>

    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fbf9f4' },
  content:     { paddingBottom: 60, paddingHorizontal: 24 },

  header:      { paddingTop: 60, paddingBottom: 8 },
  backBtn:     { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },

  hero:        { gap: 10, marginBottom: 28 },
  heroEmoji:   { fontSize: 48, marginBottom: 4 },
  heroTitle:   { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 40, color: '#31332c', letterSpacing: -1, lineHeight: 46 },
  heroSub:     { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', lineHeight: 23 },

  cartaCard:   { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4, marginBottom: 24 },
  cartaLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, marginBottom: 12 },
  cartaInput:  { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#31332c', lineHeight: 26, minHeight: 220, textAlignVertical: 'top' },

  duracionBlock:{ gap: 12, marginBottom: 28 },
  duracionLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  duracionRow: { flexDirection: 'row', gap: 8 },
  duracionChip:{ flex: 1, backgroundColor: '#f5f4ed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  duracionChipSel: { backgroundColor: '#3d6841' },
  duracionChipText:{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#5e6058' },
  duracionChipTextSel: { color: '#e4ffe0', fontFamily: 'PlusJakartaSans_700Bold' },
  fechaPreview:{ fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#3d6841', fontStyle: 'italic', textAlign: 'center' },

  btnSellar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, marginBottom: 16 },
  btnSellarText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.4 },

  nota:        { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#b1b3a9', textAlign: 'center', lineHeight: 18 },
});
