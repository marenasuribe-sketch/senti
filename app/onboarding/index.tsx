import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { signInWithGoogle } from '../../lib/auth';

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert('Error al iniciar sesión', error);
  }

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.container}>

        {/* Sección superior */}
        <View style={S.top}>
          <View style={S.badge}>
            <Text style={S.badgeText}>Tu espacio seguro</Text>
          </View>

          <Text style={S.hero}>Senti</Text>
          <Text style={S.tagline}>Cuídate como{'\n'}cuidas a los demás</Text>

          <Text style={S.desc}>
            Un lugar tranquilo para entender cómo estás,
            sin juicios y sin prisa.
          </Text>
        </View>

        {/* Planta decorativa */}
        <View style={S.plantaWrap}>
          <Text style={S.plantaEmoji}>🌱</Text>
          <View style={S.plantaSombra} />
        </View>

        {/* Valores */}
        <View style={S.valores}>
          {VALORES.map((v, i) => (
            <View key={i} style={S.valorRow}>
              <Text style={S.valorEmoji}>{v.emoji}</Text>
              <Text style={S.valorText}>{v.texto}</Text>
            </View>
          ))}
        </View>

        {/* Botón Google */}
        <View style={S.footer}>
          <TouchableOpacity
            style={[S.btnGoogle, loading && S.btnDisabled]}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#31332c" />
              : (
                <>
                  <Text style={S.googleIcon}>G</Text>
                  <Text style={S.btnGoogleText}>Continuar con Google</Text>
                </>
              )
            }
          </TouchableOpacity>

          <Text style={S.legal}>
            Al entrar aceptas que tus datos se usan solo para personalizar tu experiencia.
            Nunca compartimos tu información.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const VALORES = [
  { emoji: '🔒', texto: 'Tu diario es privado y solo tuyo' },
  { emoji: '🌿', texto: 'Sin juicios, sin comparaciones' },
  { emoji: '✨', texto: 'Pequeños pasos que sí se notan' },
];

const S = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fbf9f4' },
  container:    { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },

  top:          { alignItems: 'center', gap: 12 },
  badge:        { backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 16 },
  badgeText:    { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#3d6841', letterSpacing: 0.5 },

  hero:         { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 56, color: '#31332c', lineHeight: 60 },
  tagline:      { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: '#31332c', textAlign: 'center', lineHeight: 36 },
  desc:         { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#5e6058', textAlign: 'center', lineHeight: 25.6, marginTop: 4 },

  plantaWrap:   { alignItems: 'center', marginVertical: 32 },
  plantaEmoji:  { fontSize: 80 },
  plantaSombra: { width: 60, height: 8, backgroundColor: '#e2e3d9', borderRadius: 9999, marginTop: 8, opacity: 0.6 },

  valores:      { gap: 12, marginBottom: 32 },
  valorRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f5f4ed', borderRadius: 12, padding: 14 },
  valorEmoji:   { fontSize: 20 },
  valorText:    { fontFamily: 'Manrope_500Medium', fontSize: 14, color: '#31332c', flex: 1 },

  footer:       { gap: 16, marginTop: 'auto' as any },

  btnGoogle:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#eee1cc', borderRadius: 9999, paddingVertical: 16 },
  btnDisabled:  { opacity: 0.6 },
  googleIcon:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#595141' },
  btnGoogleText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#595141' },

  legal:        { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73', textAlign: 'center', lineHeight: 16 },
});
