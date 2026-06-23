/**
 * Exportar Diario a PDF — feature Senti+.
 *
 * INSTALAR ANTES DE USAR:
 *   npx expo install expo-print expo-sharing
 *
 * Genera un PDF en el dispositivo desde HTML y lo comparte
 * via el sheet nativo (guardar en Files, WhatsApp, Mail, etc.).
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import AvisoSenti, { AvisoConfig } from '../components/AvisoSenti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { usePremium } from '../hooks/usePremium';

type Entrada = {
  id: string;
  texto: string;
  estres: number | null;
  calma: number | null;
  energia: number | null;
  es_descarga: boolean;
  created_at: string;
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function construirHTML(entradas: Entrada[], nombre: string): string {
  const filas = entradas.map(e => {
    const tipo = e.es_descarga ? 'Descarga emocional' : 'Diario';
    const emociones = [
      e.estres != null ? `Estrés ${e.estres}%` : '',
      e.calma != null ? `Calma ${e.calma}%` : '',
      e.energia != null ? `Energía ${e.energia}%` : '',
    ].filter(Boolean).join(' · ');

    return `
      <div class="entrada">
        <div class="entrada-header">
          <span class="tipo ${e.es_descarga ? 'tipo-descarga' : ''}">${tipo}</span>
          <span class="fecha">${formatFecha(e.created_at)}</span>
        </div>
        <p class="texto">${e.texto.replace(/\n/g, '<br>')}</p>
        ${emociones ? `<p class="emociones">${emociones}</p>` : ''}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; color: #31332c; background: #fff; padding: 40px; }
  h1 { font-size: 28px; font-weight: 700; color: #3d6841; margin-bottom: 4px; }
  .subtitulo { font-size: 13px; color: #797c73; margin-bottom: 32px; }
  .entrada { border-left: 3px solid #bfefbd; padding: 16px 20px; margin-bottom: 24px; page-break-inside: avoid; }
  .entrada-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .tipo { font-size: 10px; font-weight: 700; letter-spacing: 1px; background: #bfefbd; color: #3d6841; padding: 3px 8px; border-radius: 99px; }
  .tipo-descarga { background: #eee1cc; color: #675e4d; }
  .fecha { font-size: 11px; color: #797c73; }
  .texto { font-size: 14px; line-height: 1.7; color: #31332c; }
  .emociones { font-size: 11px; color: #797c73; margin-top: 8px; font-style: italic; }
  footer { margin-top: 48px; font-size: 11px; color: #b1b3a9; text-align: center; }
</style>
</head>
<body>
  <h1>Mi Diario · Senti</h1>
  <p class="subtitulo">Exportado el ${formatFecha(new Date().toISOString())} · ${entradas.length} entradas</p>
  ${filas}
  <footer>Generado con Senti — tu espacio de bienestar personal.</footer>
</body>
</html>`;
}

export default function ExportarDiarioScreen() {
  const router = useRouter();
  const { esPremium, cargando: cargandoPlan } = usePremium();
  const [entradas, setEntradas]   = useState<Entrada[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtro, setFiltro]       = useState<'todo' | 'diario' | 'descarga'>('todo');
  const [aviso, setAviso]         = useState<AvisoConfig | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { return; }
        const { data } = await supabase
          .from('journal')
          .select('id, texto, estres, calma, energia, es_descarga, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        setEntradas(data ?? []);
      } catch {
        // Error de red: mostrar cero entradas
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  async function exportar() {
    if (!esPremium) {
      setAviso({
        titulo: 'Exportar Diario',
        mensaje: 'La exportación a PDF es una función de Senti+.',
        icono: 'lock-closed', iconoBg: '#eee1cc', iconoColor: '#595141',
        botones: [
          { texto: 'Conocer Senti+', variante: 'primario', onPress: () => router.push('/upgrade') },
          { texto: 'Ahora no', variante: 'secundario' },
        ],
      });
      return;
    }

    setExportando(true);
    try {
      // Importación dinámica — requiere que expo-print y expo-sharing estén instalados
      const Print   = await import('expo-print');
      const Sharing = await import('expo-sharing');

      const filtradas = entradas.filter(e => {
        if (filtro === 'diario')   return !e.es_descarga;
        if (filtro === 'descarga') return e.es_descarga;
        return true;
      });

      if (filtradas.length === 0) {
        setAviso({ titulo: 'Sin entradas', mensaje: 'No hay nada que exportar con este filtro.', icono: 'document-outline' });
        return;
      }

      const html = construirHTML(filtradas, 'Mi Diario');
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar mi diario' });
    } catch (e: any) {
      if (e?.message?.includes('Cannot find module')) {
        setAviso({
          titulo: 'No se pudo exportar',
          mensaje: 'La exportación a PDF no está disponible en esta versión. Inténtalo más tarde.',
          icono: 'alert-circle-outline',
        });
      } else {
        setAviso({ titulo: 'No se pudo exportar', mensaje: e?.message ?? 'Inténtalo de nuevo.', icono: 'alert-circle-outline' });
      }
    } finally {
      setExportando(false);
    }
  }

  const filtradas = entradas.filter(e => {
    if (filtro === 'diario')   return !e.es_descarga;
    if (filtro === 'descarga') return e.es_descarga;
    return true;
  });

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#31332c" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Exportar diario</Text>
          <Text style={S.headerSub}>Descarga tus reflexiones en PDF</Text>
        </View>
        {!cargandoPlan && !esPremium && (
          <View style={S.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#675e4d" />
            <Text style={S.lockText}>SENTI+</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={S.content}>

        {/* Filtros */}
        <View style={S.filtrosRow}>
          {(['todo', 'diario', 'descarga'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[S.filtroChip, filtro === f && S.filtroChipActive]}
              onPress={() => setFiltro(f)}
              activeOpacity={0.75}
            >
              <Text style={[S.filtroText, filtro === f && S.filtroTextActive]}>
                {f === 'todo' ? 'Todo' : f === 'diario' ? 'Diario' : 'Descargas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumen */}
        {cargando ? (
          <ActivityIndicator color="#3d6841" style={{ marginTop: 32 }} />
        ) : (
          <View style={S.resumenCard}>
            <Text style={S.resumenNum}>{filtradas.length}</Text>
            <Text style={S.resumenLbl}>
              {filtradas.length === 1 ? 'entrada' : 'entradas'} a exportar
            </Text>
          </View>
        )}

        {/* Preview de las últimas 3 */}
        {!cargando && filtradas.slice(0, 3).map(e => (
          <View key={e.id} style={S.previewCard}>
            <Text style={S.previewFecha}>{formatFecha(e.created_at)}</Text>
            <Text style={S.previewTexto} numberOfLines={2}>
              {e.texto.replace(/\n/g, ' ')}
            </Text>
          </View>
        ))}

        {filtradas.length > 3 && (
          <Text style={S.masEntradas}>+ {filtradas.length - 3} entradas más en el PDF</Text>
        )}

        {/* Botón exportar */}
        <TouchableOpacity
          style={[S.btnExportar, (exportando || cargando) && S.btnDisabled]}
          onPress={exportar}
          disabled={exportando || cargando}
          activeOpacity={0.85}
        >
          {exportando ? (
            <ActivityIndicator color="#e4ffe0" />
          ) : (
            <>
              <Ionicons name="document-text" size={18} color="#e4ffe0" />
              <Text style={S.btnExportarText}>
                {esPremium ? 'Exportar PDF' : 'Ver Senti+ para exportar'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={S.nota}>
          El PDF incluye el texto completo, fecha y niveles emocionales de cada entrada.
        </Text>

      </ScrollView>
      <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },

  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#f5f4ed' },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: '#efeee6', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: '#31332c' },
  headerSub:    { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#797c73', marginTop: 1 },
  lockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eee1cc', borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 10 },
  lockText:     { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#675e4d', letterSpacing: 1.2 },

  content:      { padding: 24, gap: 16, paddingBottom: 48 },

  filtrosRow:   { flexDirection: 'row', gap: 8 },
  filtroChip:   { flex: 1, backgroundColor: '#f5f4ed', borderRadius: 9999, paddingVertical: 10, alignItems: 'center' },
  filtroChipActive: { backgroundColor: '#3d6841' },
  filtroText:   { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#5e6058' },
  filtroTextActive: { color: '#e4ffe0', fontFamily: 'PlusJakartaSans_700Bold' },

  resumenCard:  { backgroundColor: '#bfefbd', borderRadius: 16, padding: 20, alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  resumenNum:   { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#3d6841' },
  resumenLbl:   { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#3d6841' },

  previewCard:  { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, gap: 4,
    shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  previewFecha: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#3d6841', textTransform: 'capitalize', letterSpacing: 0.3 },
  previewTexto: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', lineHeight: 19 },

  masEntradas:  { fontFamily: 'Manrope_500Medium', fontSize: 12, color: '#797c73', textAlign: 'center' },

  btnExportar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, marginTop: 8 },
  btnExportarText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },
  btnDisabled:  { opacity: 0.5 },

  nota:         { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#b1b3a9', textAlign: 'center', lineHeight: 18 },
});
