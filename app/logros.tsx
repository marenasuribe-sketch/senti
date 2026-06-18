import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LOGROS, type LogroId, type Logro } from '../lib/logros';

type CategoriaInfo = {
  label: string;
  color: string;
  bg: string;
};

const CATEGORIAS: Record<string, CategoriaInfo> = {
  inicio:     { label: 'Primeros pasos',     color: '#3d6841', bg: '#bfefbd' },
  sentir:     { label: 'Permitirte sentir',  color: '#5a4a8a', bg: '#f0ebf8' },
  constancia: { label: 'Constancia amable',  color: '#8a5010', bg: '#fef3e2' },
  soltar:     { label: 'Soltar y agradecer', color: '#3d6841', bg: '#eefef0' },
  voz:        { label: 'Tu voz',             color: '#2e4a6a', bg: '#e8edf5' },
  planta:     { label: 'Tu planta',          color: '#3a6030', bg: '#e6f0e6' },
};

export default function LogrosScreen() {
  const router = useRouter();
  const [desbloqueados, setDesbloqueados] = useState<Set<LogroId>>(new Set());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { setCargando(false); return; }

      const { data } = await supabase
        .from('logros_usuario')
        .select('logro_id')
        .eq('user_id', userId);

      setDesbloqueados(new Set((data ?? []).map(l => l.logro_id as LogroId)));
      setCargando(false);
    }
    cargar();
  }, []);

  const totalDesbloqueados = desbloqueados.size;
  const totalLogros = Object.keys(LOGROS).length;

  // Agrupar por categoría
  const porCategoria = Object.values(LOGROS).reduce<Record<string, Logro[]>>((acc, logro) => {
    if (!acc[logro.categoria]) acc[logro.categoria] = [];
    acc[logro.categoria].push(logro);
    return acc;
  }, {});

  if (cargando) {
    return <View style={S.cargandoBg}><ActivityIndicator color="#3d6841" /></View>;
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#5e6058" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Tus logros</Text>
          <Text style={S.headerSub}>{totalDesbloqueados} de {totalLogros} desbloqueados</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.content}>

        {/* Barra de progreso general */}
        <View style={S.progressCard}>
          <View style={S.progressBar}>
            <View style={[S.progressFill, { width: `${(totalDesbloqueados / totalLogros) * 100}%` as any }]} />
          </View>
          <Text style={S.progressLabel}>{Math.round((totalDesbloqueados / totalLogros) * 100)}% completado</Text>
        </View>

        {/* Grupos por categoría */}
        {Object.entries(porCategoria).map(([categoria, logros]) => {
          const info = CATEGORIAS[categoria];
          const desbloqueadosEnCat = logros.filter(l => desbloqueados.has(l.id)).length;
          return (
            <View key={categoria} style={S.grupo}>
              <View style={S.grupoHeader}>
                <Text style={[S.grupoTitle, { color: info.color }]}>{info.label.toUpperCase()}</Text>
                <Text style={S.grupoCount}>{desbloqueadosEnCat}/{logros.length}</Text>
              </View>
              <View style={S.grupoItems}>
                {logros.map(logro => {
                  const desbloqueado = desbloqueados.has(logro.id);
                  return (
                    <View
                      key={logro.id}
                      style={[S.logroItem, desbloqueado && { backgroundColor: info.bg }]}
                    >
                      <View style={[S.logroIconWrap, desbloqueado ? { backgroundColor: info.color } : S.logroIconBloqueado]}>
                        <Ionicons
                          name={desbloqueado ? logro.icono as any : 'lock-closed-outline'}
                          size={16}
                          color={desbloqueado ? '#fff' : '#b1b3a9'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[S.logroNombre, !desbloqueado && S.textoBloqueado]}>
                          {logro.nombre}
                        </Text>
                        {desbloqueado && (
                          <Text style={[S.logroMensaje, { color: info.color }]}>
                            {logro.mensaje}
                          </Text>
                        )}
                        {!desbloqueado && (
                          <Text style={S.textoPendiente}>Aún por descubrir</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fbf9f4' },
  cargandoBg:      { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' },

  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: '#31332c', letterSpacing: -0.3 },
  headerSub:       { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#797c73', marginTop: 1 },

  content:         { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },

  progressCard:    { backgroundColor: '#f5f4ed', borderRadius: 16, padding: 18, gap: 10 },
  progressBar:     { height: 8, backgroundColor: '#e2e3d9', borderRadius: 9999, overflow: 'hidden' },
  progressFill:    { height: 8, backgroundColor: '#3d6841', borderRadius: 9999 },
  progressLabel:   { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#5e6058', textAlign: 'right' },

  grupo:           { gap: 10 },
  grupoHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grupoTitle:      { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.5 },
  grupoCount:      { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: '#797c73' },
  grupoItems:      { gap: 8 },

  logroItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  logroIconWrap:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logroIconBloqueado: { backgroundColor: '#f5f4ed' },

  logroNombre:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#31332c', lineHeight: 20 },
  logroMensaje:    { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2, fontStyle: 'italic' },
  textoBloqueado:  { color: '#b1b3a9' },
  textoPendiente:  { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#b1b3a9', marginTop: 2 },
});
