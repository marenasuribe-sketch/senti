import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREGUNTAS = [
  {
    pregunta: '¿Cómo te sientes la mayor parte del tiempo?',
    opciones: ['Tranquila', 'Ansiosa', 'Melancólica', 'Energética', 'Variable'],
  },
  {
    pregunta: '¿Cuál es tu mayor fuente de estrés ahora mismo?',
    opciones: ['Trabajo', 'Relaciones', 'Salud', 'Finanzas', 'Sin estrés'],
  },
  {
    pregunta: '¿Qué esperas encontrar en Senti?',
    opciones: ['Manejar el estrés', 'Ser más positiva', 'Conocerme mejor', 'Tener rutinas', 'Procesar emociones'],
  },
  {
    pregunta: '¿Cómo sueles lidiar con las emociones difíciles?',
    opciones: ['Me lo guardo', 'Lo hablo', 'Escribo', 'Me distraigo', 'Lloro y sigo'],
  },
  {
    pregunta: '¿Qué momento del día suele ser el más difícil para ti?',
    opciones: ['Al despertar', 'En el trabajo', 'Por la tarde', 'Al dormir', 'Los fines de semana'],
  },
];

export default function IntakeScreen() {
  const router = useRouter();
  const [paso, setPaso]         = useState(0);
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const preguntaActual = PREGUNTAS[paso];
  const total = PREGUNTAS.length;
  const esFinal = paso === total - 1;

  async function handleSiguiente() {
    if (!seleccionada) return;

    const nuevas = [...respuestas, seleccionada];

    if (esFinal) {
      await AsyncStorage.setItem('senti_intake', JSON.stringify(nuevas));
      router.replace('/onboarding/planta');
    } else {
      setRespuestas(nuevas);
      setPaso(paso + 1);
      setSeleccionada(null);
    }
  }

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.container}>

        {/* Progreso */}
        <View style={S.progressWrap}>
          <View style={S.progressBar}>
            <View style={[S.progressFill, { width: `${((paso + 1) / total) * 100}%` as any }]} />
          </View>
          <Text style={S.progressText}>{paso + 1} de {total}</Text>
        </View>

        {/* Pregunta */}
        <View style={S.questionWrap}>
          <Text style={S.eyebrow}>Cuéntame un poco de ti</Text>
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
                {activa && <View style={S.chipDot} />}
                <Text style={[S.chipText, activa && S.chipTextActivo]}>{op}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón siguiente */}
        <View style={S.footer}>
          <TouchableOpacity
            style={[S.btnSiguiente, !seleccionada && S.btnDisabled]}
            onPress={handleSiguiente}
            disabled={!seleccionada}
            activeOpacity={0.85}
          >
            <Text style={S.btnSiguienteText}>
              {esFinal ? 'Ver mis plantas →' : 'Siguiente →'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fbf9f4' },
  container:        { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },

  progressWrap:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  progressBar:      { flex: 1, height: 4, backgroundColor: '#e2e3d9', borderRadius: 9999, overflow: 'hidden' },
  progressFill:     { height: '100%', backgroundColor: '#3d6841', borderRadius: 9999 },
  progressText:     { fontFamily: 'Manrope_500Medium', fontSize: 12, color: '#797c73' },

  questionWrap:     { marginBottom: 40, gap: 12 },
  eyebrow:          { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, textTransform: 'uppercase' },
  question:         { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, color: '#31332c', lineHeight: 34 },

  opciones:         { gap: 12 },
  chip:             {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f5f4ed', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  chipActivo:       { backgroundColor: '#bfefbd' },
  chipDot:          { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#3d6841' },
  chipText:         { fontFamily: 'Manrope_500Medium', fontSize: 16, color: '#5e6058' },
  chipTextActivo:   { fontFamily: 'Manrope_600SemiBold', color: '#31332c' },

  footer:           { marginTop: 'auto' as any },
  btnSiguiente:     { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  btnDisabled:      { opacity: 0.35 },
  btnSiguienteText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0' },
});
