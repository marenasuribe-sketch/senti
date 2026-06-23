import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const PREGUNTAS = [
  {
    eyebrow: 'PREGUNTA UNO',
    pregunta: '¿Cómo te sientes la mayor parte del tiempo?',
    opciones: ['Tranquila', 'Ansiosa', 'Melancólica', 'Energética', 'Variable'],
  },
  {
    eyebrow: 'PREGUNTA DOS',
    pregunta: '¿Cuál es tu mayor fuente de estrés ahora mismo?',
    opciones: ['Trabajo', 'Relaciones', 'Salud', 'Finanzas', 'Sin estrés'],
  },
  {
    eyebrow: 'PREGUNTA TRES',
    pregunta: '¿Qué esperas encontrar en Senti?',
    opciones: ['Manejar el estrés', 'Ser más positiva', 'Conocerme mejor', 'Tener rutinas', 'Procesar emociones'],
  },
  {
    eyebrow: 'PREGUNTA CUATRO',
    pregunta: '¿Cómo sueles lidiar con las emociones difíciles?',
    opciones: ['Me lo guardo', 'Lo hablo', 'Escribo', 'Me distraigo', 'Lloro y sigo'],
  },
  {
    eyebrow: 'PREGUNTA CINCO',
    pregunta: '¿Qué momento del día suele ser el más difícil para ti?',
    opciones: ['Al despertar', 'En el trabajo', 'Por la tarde', 'Al dormir', 'Los fines de semana'],
  },
];

export default function IntakeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paso, setPaso]                 = useState(0);
  const [respuestas, setRespuestas]     = useState<string[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [guardando, setGuardando]       = useState(false);

  const preguntaActual = PREGUNTAS[paso];
  const total = PREGUNTAS.length;
  const esFinal = paso === total - 1;

  async function handleSiguiente() {
    if (!seleccionada || guardando) return;
    const nuevas = [...respuestas, seleccionada];
    if (esFinal) {
      setGuardando(true);
      try {
        await AsyncStorage.setItem('senti_intake', JSON.stringify(nuevas));
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const preguntas = PREGUNTAS.map(p => p.eyebrow.toLowerCase().replace('pregunta ', 'p'));
          const respuestasMap = Object.fromEntries(preguntas.map((k, i) => [k, nuevas[i] ?? '']));
          await supabase.from('perfiles').upsert(
            { user_id: session.user.id, intake: respuestasMap },
            { onConflict: 'user_id' }
          );
        }
        router.replace('/onboarding/planta');
      } catch {
        // Si falla el guardado, pasar igual — el intake no es bloqueante
        router.replace('/onboarding/planta');
      } finally {
        setGuardando(false);
      }
    } else {
      setRespuestas(nuevas);
      setPaso(paso + 1);
      setSeleccionada(null);
    }
  }

  function handleAtras() {
    if (paso === 0) return;
    const previas = respuestas.slice(0, -1);
    setRespuestas(previas);
    setSeleccionada(respuestas[paso - 1] ?? null);
    setPaso(paso - 1);
  }

  return (
    <View style={[S.safe, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={S.container}>

        {/* Header con back + step dots */}
        <View style={S.header}>
          <TouchableOpacity
            style={[S.backBtn, paso === 0 && { opacity: 0.3 }]}
            onPress={handleAtras}
            disabled={paso === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#31332c" />
          </TouchableOpacity>

          <View style={S.dotsRow}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[S.dot, i <= paso && S.dotActive]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

          {/* Pregunta editorial */}
          <View style={S.questionWrap}>
            <Text style={S.eyebrow}>{preguntaActual.eyebrow}</Text>
            <Text style={S.question}>{preguntaActual.pregunta}</Text>
          </View>

          {/* Opciones */}
          <View style={S.opciones}>
            {preguntaActual.opciones.map((op) => {
              const activa = seleccionada === op;
              return (
                <TouchableOpacity
                  key={op}
                  style={[S.chip, activa && S.chipActivo]}
                  onPress={() => setSeleccionada(op)}
                  activeOpacity={0.75}
                >
                  <Text style={[S.chipText, activa && S.chipTextActivo]}>{op}</Text>
                  {activa && <Ionicons name="checkmark-circle" size={20} color="#3d6841" />}
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={S.footer}>
          <TouchableOpacity
            style={[S.btnSiguiente, (!seleccionada || guardando) && S.btnDisabled]}
            onPress={handleSiguiente}
            disabled={!seleccionada || guardando}
            activeOpacity={0.85}
          >
            <Text style={S.btnSiguienteText}>
              {esFinal ? 'Ver mis plantas' : 'Siguiente'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#e4ffe0" />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const S = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fbf9f4' },
  container:      { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f4ed', alignItems: 'center', justifyContent: 'center' },
  dotsRow:        { flexDirection: 'row', gap: 6, flex: 1 },
  dot:            { flex: 1, height: 4, borderRadius: 9999, backgroundColor: '#e2e3d9' },
  dotActive:      { backgroundColor: '#3d6841' },

  scroll:         { paddingBottom: 24 },
  questionWrap:   { marginBottom: 36, gap: 12 },
  eyebrow:        { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.8 },
  question:       { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, color: '#31332c', lineHeight: 40, letterSpacing: -0.6 },

  opciones:       { gap: 10 },
  chip:           {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f5f4ed', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
  },
  chipActivo:     { backgroundColor: '#bfefbd' },
  chipText:       { fontFamily: 'Manrope_500Medium', fontSize: 16, color: '#5e6058' },
  chipTextActivo: { fontFamily: 'PlusJakartaSans_700Bold', color: '#1e4824' },

  footer:         { marginTop: 'auto' as any },
  btnSiguiente:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16 },
  btnDisabled:    { opacity: 0.35 },
  btnSiguienteText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0' },
});
