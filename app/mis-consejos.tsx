import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

type Consejo = {
  id: string;
  consejo: string;
  reflexion: string | null;
  emociones: { label: string; valor: number; color: string }[] | null;
  created_at: string;
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function MisConsejosScreen() {
  const router = useRouter();
  const [consejos, setConsejos] = useState<Consejo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { return; }
        const { data } = await supabase
          .from('consejos_guardados')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        setConsejos(data ?? []);
      } catch {
        // Error de red: lista vacía, sin crash
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#31332c" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Mis consejos</Text>
          <Text style={S.headerSub}>Lo que tu diario te dijo</Text>
        </View>
        <View style={S.badge}>
          <Ionicons name="bookmark" size={14} color="#3d6841" />
          <Text style={S.badgeText}>SENTI+</Text>
        </View>
      </View>

      {cargando ? (
        <View style={S.centered}>
          <ActivityIndicator color="#3d6841" />
        </View>
      ) : consejos.length === 0 ? (
        <View style={S.centered}>
          <Text style={S.emptyEmoji}>💬</Text>
          <Text style={S.emptyTitle}>Todavía no guardaste nada</Text>
          <Text style={S.emptySub}>
            Después de analizar tu diario, toca "Guardar este consejo" para verlo aquí.
          </Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => router.push('/(tabs)/journal')} activeOpacity={0.85}>
            <Text style={S.emptyBtnText}>Ir al diario</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.content}>

          <Text style={S.intro}>
            {consejos.length === 1 ? '1 consejo guardado' : `${consejos.length} consejos guardados`}
          </Text>

          {consejos.map((c) => (
            <View key={c.id} style={S.card}>
              <Text style={S.cardFecha}>{formatFecha(c.created_at)}</Text>

              <View style={S.consejoWrap}>
                <Text style={S.consejoText}>{c.consejo}</Text>
              </View>

              {c.reflexion ? (
                <View style={S.reflexionWrap}>
                  <Text style={S.reflexionLabel}>REFLEXIÓN DEL DÍA</Text>
                  <Text style={S.reflexionText}>{c.reflexion}</Text>
                </View>
              ) : null}

              {c.emociones && c.emociones.length > 0 ? (
                <View style={S.emocionesRow}>
                  {c.emociones.map(e => (
                    <View key={e.label} style={S.emocionChip}>
                      <View style={[S.emocionDot, { backgroundColor: e.color }]} />
                      <Text style={S.emocionLabel}>{e.label} {e.valor}%</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#f5f4ed' },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: '#efeee6', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: '#31332c' },
  headerSub:    { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#797c73', marginTop: 1 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 10 },
  badgeText:    { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#3d6841', letterSpacing: 1.2 },

  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', textAlign: 'center' },
  emptySub:     { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#797c73', textAlign: 'center', lineHeight: 21 },
  emptyBtn:     { marginTop: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#e4ffe0' },

  content:      { padding: 24, gap: 16 },
  intro:        { fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#797c73', marginBottom: 4 },

  card:         { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, gap: 16,
    shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  cardFecha:    { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: '#3d6841', textTransform: 'capitalize', letterSpacing: 0.3 },

  consejoWrap:  { backgroundColor: '#3d6841', borderRadius: 16, padding: 18 },
  consejoText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', lineHeight: 23, letterSpacing: -0.2 },

  reflexionWrap:{ backgroundColor: '#f5f4ed', borderRadius: 12, padding: 14, gap: 4 },
  reflexionLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.5 },
  reflexionText:{ fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#31332c', lineHeight: 20, fontStyle: 'italic' },

  emocionesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emocionChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5f4ed', borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 10 },
  emocionDot:   { width: 7, height: 7, borderRadius: 4 },
  emocionLabel: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: '#5e6058' },
});
