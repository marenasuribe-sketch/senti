import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithGoogle } from '../../lib/auth';
import SentiLogo from '../../components/SentiLogo';
import AvisoSenti, { AvisoConfig } from '../../components/AvisoSenti';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<AvisoConfig | null>(null);

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) setAviso({ titulo: 'Error al iniciar sesión', mensaje: error, icono: 'alert-circle-outline' });
  }

  return (
    <View style={[S.safe, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={S.container}>

        {/* Hero editorial */}
        <View style={S.hero}>
          <View style={S.brandRow}>
            <SentiLogo size={24} />
            <Text style={S.brand}>Senti</Text>
          </View>
        </View>

        {/* Planta con glow */}
        <View style={S.plantaWrap}>
          <View style={S.plantaGlow} />
          <Text style={S.plantaEmoji}>🌱</Text>
        </View>

        {/* Tagline grande */}
        <View style={S.taglineWrap}>
          <Text style={S.taglineLabel}>TU ESPACIO SEGURO</Text>
          <Text style={S.tagline}>Cuídate como cuidas a los demás.</Text>
          <Text style={S.desc}>
            Un lugar tranquilo para entender cómo estás, sin juicios y sin prisa.
          </Text>
        </View>

        {/* Valores — minimalistas */}
        <View style={S.valores}>
          {VALORES.map((v, i) => (
            <View key={i} style={S.valorRow}>
              <View style={S.valorIcon}>
                <Ionicons name={v.icon} size={14} color="#3d6841" />
              </View>
              <Text style={S.valorText}>{v.texto}</Text>
            </View>
          ))}
        </View>

        {/* Footer con CTA */}
        <View style={S.footer}>
          <TouchableOpacity
            style={[S.btnGoogle, loading && S.btnDisabled]}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#e4ffe0" />
              : (
                <>
                  <Text style={S.googleIcon}>G</Text>
                  <Text style={S.btnGoogleText}>Continuar con Google</Text>
                </>
              )
            }
          </TouchableOpacity>

          <Text style={S.legal}>
            Al continuar aceptas nuestros{' '}
            <Text style={S.legalLink} onPress={() => router.push('/privacidad' as any)}>
              Términos y Política de Privacidad
            </Text>
            . Tus datos nunca se comparten con terceros.
          </Text>
        </View>

      </View>
      <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
    </View>
  );
}

const VALORES: Array<{ icon: keyof typeof Ionicons.glyphMap; texto: string }> = [
  { icon: 'lock-closed', texto: 'Tu diario es privado y solo tuyo' },
  { icon: 'leaf',        texto: 'Sin juicios, sin comparaciones' },
  { icon: 'sparkles',    texto: 'Pequeños pasos que sí se notan' },
];

const S = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fbf9f4' },
  container:    { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },

  hero:         { alignItems: 'flex-start' },
  brandRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand:        { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },

  plantaWrap:   { alignItems: 'center', justifyContent: 'center', height: 200, marginTop: 24 },
  plantaGlow:   { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#bfefbd', opacity: 0.5 },
  plantaEmoji:  { fontSize: 120 },

  taglineWrap:  { gap: 10, marginTop: 16 },
  taglineLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.8 },
  tagline:      { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#31332c', letterSpacing: -0.8, lineHeight: 42 },
  desc:         { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', lineHeight: 23, marginTop: 4 },

  valores:      { gap: 10, marginTop: 28 },
  valorRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valorIcon:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#bfefbd', alignItems: 'center', justifyContent: 'center' },
  valorText:    { fontFamily: 'Manrope_500Medium', fontSize: 14, color: '#5e6058', flex: 1 },

  footer:       { gap: 14, marginTop: 'auto' as any },
  btnGoogle:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16 },
  btnDisabled:  { opacity: 0.6 },
  googleIcon:   { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#e4ffe0' },
  btnGoogleText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0' },
  legal:        { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73', textAlign: 'center', lineHeight: 16 },
  legalLink:    { fontFamily: 'Manrope_700Bold', color: '#3d6841', textDecorationLine: 'underline' },
});
