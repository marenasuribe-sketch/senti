import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { marcarAbierta, formatearFecha } from '../lib/capsulas';

export default function CapsulaAperturaScreen() {
  const router = useRouter();
  const { id, texto, fecha_creacion } = useLocalSearchParams<{
    id: string; texto: string; fecha_creacion: string;
  }>();

  const [fase, setFase]             = useState<'sobre' | 'texto' | 'opciones'>('sobre');
  const [respuesta, setRespuesta]   = useState('');
  const [modoRespuesta, setModoRespuesta] = useState(false);
  const [guardando, setGuardando]   = useState(false);

  // Animaciones
  const sobreScale   = useRef(new Animated.Value(1)).current;
  const sobreOpacity = useRef(new Animated.Value(1)).current;
  const textoOpacity = useRef(new Animated.Value(0)).current;
  const textoY       = useRef(new Animated.Value(20)).current;
  const opcionesOpacity = useRef(new Animated.Value(0)).current;

  const fechaCreacionFmt = fecha_creacion ? formatearFecha(fecha_creacion) : '';

  useEffect(() => {
    // Fase 1: sobre pulsa suavemente
    Animated.loop(
      Animated.sequence([
        Animated.timing(sobreScale, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(sobreScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function abrirSobre() {
    // Detener el loop
    sobreScale.stopAnimation();

    // Animación: sobre se aleja y desaparece
    Animated.parallel([
      Animated.timing(sobreScale,   { toValue: 1.3, duration: 400, useNativeDriver: true }),
      Animated.timing(sobreOpacity, { toValue: 0,   duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setFase('texto');
      // Texto aparece con fade + slide
      Animated.parallel([
        Animated.timing(textoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textoY,       { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        // Opciones aparecen después
        setTimeout(() => {
          setFase('opciones');
          Animated.timing(opcionesOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, 800);
      });
    });
  }

  async function handleCerrar(conRespuesta?: string) {
    setGuardando(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) await marcarAbierta(supabase, id, userId, conRespuesta);
    setGuardando(false);
    router.replace('/(tabs)');
  }

  async function handleGuardarRespuesta() {
    if (!respuesta.trim()) { handleCerrar(); return; }
    await handleCerrar(respuesta.trim());
  }

  return (
    <View style={S.container}>

      {/* Fase sobre — pantalla completa centrada */}
      {(fase === 'sobre' || fase === 'texto') && (
        <View style={S.centroWrap}>

          {/* Sobre animado */}
          <Animated.View style={[S.sobreWrap, { opacity: sobreOpacity, transform: [{ scale: sobreScale }] }]}>
            <TouchableOpacity onPress={abrirSobre} activeOpacity={0.85} style={S.sobreBtn}>
              <Text style={S.sobreEmoji}>📮</Text>
              <Text style={S.sobreHint}>Toca para abrir</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Texto de la carta */}
          {fase === 'texto' && (
            <Animated.View style={[S.textoWrap, { opacity: textoOpacity, transform: [{ translateY: textoY }] }]}>
              <Text style={S.textoLabel}>TE ESCRIBISTE HACE {fechaCreacionFmt ? `· ${fechaCreacionFmt.toUpperCase()}` : ''}</Text>
              <Text style={S.textoContenido}>{texto}</Text>
            </Animated.View>
          )}
        </View>
      )}

      {/* Fase opciones — scroll completo */}
      {fase === 'opciones' && (
        <ScrollView style={S.container} contentContainerStyle={S.opcionesContent} keyboardShouldPersistTaps="handled">

          {/* Carta */}
          <Animated.View style={{ opacity: opcionesOpacity }}>
            <Text style={S.textoLabel}>TE ESCRIBISTE {fechaCreacionFmt ? `EL ${fechaCreacionFmt.toUpperCase()}` : ''}</Text>
            <Text style={S.textoContenido}>{texto}</Text>
          </Animated.View>

          {/* Modo respuesta */}
          {modoRespuesta ? (
            <View style={S.respuestaBlock}>
              <Text style={S.respuestaLabel}>TU RESPUESTA</Text>
              <TextInput
                style={S.respuestaInput}
                value={respuesta}
                onChangeText={setRespuesta}
                placeholder="¿Qué le dirías a esa versión tuya?"
                placeholderTextColor="#b1b3a9"
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={[S.btnPrimario, guardando && S.btnDisabled]}
                onPress={handleGuardarRespuesta}
                disabled={guardando}
                activeOpacity={0.85}
              >
                {guardando
                  ? <ActivityIndicator color="#e4ffe0" />
                  : <Text style={S.btnPrimarioText}>Guardar y cerrar</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[S.opcionesBlock, { opacity: opcionesOpacity }]}>
              <TouchableOpacity
                style={S.btnPrimario}
                onPress={() => setModoRespuesta(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil" size={16} color="#e4ffe0" />
                <Text style={S.btnPrimarioText}>Responderle a mi yo pasado</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.btnSecundario, guardando && S.btnDisabled]}
                onPress={() => handleCerrar()}
                disabled={guardando}
                activeOpacity={0.85}
              >
                {guardando
                  ? <ActivityIndicator color="#3d6841" />
                  : <Text style={S.btnSecundarioText}>Cerrar y guardar</Text>
                }
              </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#fbf9f4' },

  centroWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  sobreWrap:     { alignItems: 'center', marginBottom: 24 },
  sobreBtn:      { alignItems: 'center', gap: 12 },
  sobreEmoji:    { fontSize: 96 },
  sobreHint:     { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#797c73', letterSpacing: 0.5, fontStyle: 'italic' },

  textoWrap:     { alignItems: 'center', gap: 16, paddingHorizontal: 8 },
  textoLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 },
  textoContenido:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: '#31332c', lineHeight: 34, letterSpacing: -0.3, textAlign: 'left' },

  opcionesContent:{ padding: 32, paddingTop: 64, paddingBottom: 60, gap: 28 },
  opcionesBlock:  { gap: 12 },

  respuestaBlock: { gap: 14 },
  respuestaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  respuestaInput: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#31332c', lineHeight: 26, minHeight: 160, textAlignVertical: 'top', shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },

  btnPrimario:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16 },
  btnPrimarioText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', letterSpacing: 0.3 },
  btnSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f4ed', borderRadius: 9999, paddingVertical: 14 },
  btnSecundarioText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#3d6841' },
  btnDisabled:   { opacity: 0.5 },
});
