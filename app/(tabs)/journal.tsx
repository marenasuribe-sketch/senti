import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { supabase } from '../../lib/supabase';
import { transcribirAudio } from '../../lib/edge';
import { sumarGotas } from '../../lib/planta';
import { LIMITES_TEXTO } from '../../lib/validation';
import { verificarLogros, type Logro } from '../../lib/logros';
import { usePremium } from '../../hooks/usePremium';
import CelebracionEtapa from '../../components/CelebracionEtapa';
import LogroModal from '../../components/LogroModal';
import SentiLogo from '../../components/SentiLogo';

type PillTipo = 'warm' | 'mist' | 'sage';

type AnalysisResult = {
  reflexion: string;
  acciones: string[];
  accionTipos: PillTipo[];
  emociones: { label: string; valor: number; color: string }[];
  observacion: string;
  consejo: string;
};

function todayHeader() {
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function analyzeWithClaude(text: string, session: { access_token: string }): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analizar-journal', {
    body: { texto: text },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message ?? 'Error al conectar con el análisis');
  if (data?.error) {
    if (data.error === 'LIMITE_DIA') throw new Error('LIMITE_DIA');
    if (data.error === 'LIMITE_MES') throw new Error('LIMITE_MES');
    throw new Error(data.error);
  }
  return data.analysis as AnalysisResult;
}

const PILL_STYLES: Record<PillTipo, { bg: string; color: string }> = {
  warm: { bg: '#f5ede0', color: '#7a4f2e' },
  sage: { bg: '#bfefbd', color: '#1e4824' },
  mist: { bg: '#e8edf5', color: '#2e4a6a' },
};

export default function JournalScreen() {
  const router = useRouter();
  const { esPremium } = usePremium();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [celebracion, setCelebracion] = useState<{ etapa: number; plantaId: string | null } | null>(null);
  const [logros, setLogros]           = useState<Logro[]>([]);
  const [logroIdx, setLogroIdx]       = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [consejoGuardado, setConsejoGuardado] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function handleMic() {
    if (!esPremium) {
      Alert.alert(
        'Audio en el Diario',
        'Con Senti+ puedes hablar directamente en tu diario. ¿Quieres conocer el plan?',
        [{ text: 'Ahora no', style: 'cancel' }, { text: 'Ver Senti+', onPress: () => router.push('/upgrade') }],
      );
      return;
    }
    if (isRecording) {
      // Detener y transcribir
      try {
        setTranscribing(true);
        await recorder.stop();
        const uri = recorder.uri;
        setIsRecording(false);
        if (!uri) throw new Error('Sin audio');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sin sesión');
        const t = await transcribirAudio(uri, session.access_token);
        setText(prev => prev.trim() ? `${prev.trim()}\n${t}` : t);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        if (msg === 'LIMITE_AUDIO_GRATIS') Alert.alert('Límite de audio', 'Ya usaste tu audio de hoy.');
        else if (msg === 'LIMITE_AUDIO_PREMIUM') Alert.alert('Límite de audio', 'Ya usaste tus 10 audios de hoy.');
        else Alert.alert('Error al transcribir', msg);
      } finally { setTranscribing(false); }
    } else {
      // Iniciar grabación
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permiso denegado', 'Senti necesita acceso al micrófono.'); return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    }
  }

  async function handleGuardarConsejo() {
    if (!result?.consejo) return;
    if (!esPremium) {
      Alert.alert(
        'Consejos guardados',
        'Con Senti+ puedes guardar los consejos de tu diario y releerlos cuando quieras.',
        [{ text: 'Cerrar', style: 'cancel' }, { text: 'Ver Senti+', onPress: () => router.push('/upgrade') }],
      );
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase.from('consejos_guardados').insert({
      user_id: userId,
      consejo: result.consejo,
      reflexion: result.reflexion,
      emociones: result.emociones,
    });
    setConsejoGuardado(true);
  }

  async function handleAnalizar() {
    if (text.trim().length < 10) { Alert.alert('Escribe un poco más', 'Cuéntame cómo te sientes hoy.'); return; }
    setLoading(true); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || !session) { Alert.alert('Error', 'No hay sesión activa.'); setLoading(false); return; }

      const analysis = await analyzeWithClaude(text, session);

      const stress  = analysis.emociones.find(e => e.label === 'Estrés')?.valor  ?? 0;
      const calm    = analysis.emociones.find(e => e.label === 'Calma')?.valor   ?? 0;
      const energy  = analysis.emociones.find(e => e.label === 'Energía')?.valor ?? 0;

      await supabase.from('journal').insert({
        user_id: userId, texto: text,
        estres: stress, calma: calm, energia: energy,
      });

      const sumar = await sumarGotas(supabase, userId, 3);
      if (sumar.subio) {
        setCelebracion({ etapa: sumar.etapaDespues, plantaId: sumar.plantaId });
      }

      // Verificar logros
      const nuevosLogros = await verificarLogros(supabase, userId, {
        tipo: 'journal',
        estres: stress,
      });
      if (nuevosLogros.length > 0) {
        setLogros(nuevosLogros);
        setLogroIdx(0);
      }

      setResult(analysis);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'LIMITE_DIA') {
        Alert.alert(
          'Ya reflexionaste hoy',
          'El plan gratuito incluye 1 análisis al día. Vuelve mañana, o pasa a Senti+ para 4 al mes.',
          [{ text: 'Cerrar', style: 'cancel' }, { text: 'Ver Senti+', onPress: () => router.push('/upgrade') }],
        );
      } else if (msg === 'LIMITE_MES') {
        Alert.alert(
          'Límite mensual alcanzado',
          'Usaste tus 4 análisis de Senti+ este mes. Se renuevan el próximo mes.',
          [{ text: 'Entendido' }],
        );
      } else {
        Alert.alert('Algo salió mal', msg);
      }
    }
    finally { setLoading(false); }
  }

  function handleNuevaEntrada() { setText(''); setResult(null); setLogros([]); setLogroIdx(0); setConsejoGuardado(false); }

  function cerrarLogro() {
    if (logroIdx + 1 < logros.length) {
      setLogroIdx(prev => prev + 1);
    } else {
      setLogros([]);
      setLogroIdx(0);
    }
  }

  const scrollRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
    <ScrollView
      ref={scrollRef}
      style={S.container}
      contentContainerStyle={S.content}
      keyboardShouldPersistTaps="handled"
    >

      {/* TopBar */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <SentiLogo size={22} />
          <Text style={S.logoText}>Senti</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={22} color="#5e6058" />
        </TouchableOpacity>
      </View>

      <View style={S.section}>

        {/* Hero editorial */}
        <Text style={S.heroLabel}>REFLEXIÓN DIARIA · {todayHeader().toUpperCase()}</Text>
        <Text style={S.heroTitle}>El lienzo de hoy</Text>

        {/* Input card grande */}
        <View style={S.inputCard}>
          <Text style={S.inputLabel}>¿Qué tienes en mente?</Text>
          <TextInput
            style={S.inputBig}
            placeholder="Empieza a escribir tus pensamientos aquí…"
            placeholderTextColor="#b1b3a9"
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={(t) => {
              setText(t);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
            }}
            maxLength={LIMITES_TEXTO.journal}
            editable={!loading && !result}
          />
          <View style={S.inputDivider} />
          <View style={S.inputFooter}>
            <TouchableOpacity
              style={[S.micBtn, isRecording && S.micBtnActive]}
              onPress={handleMic}
              activeOpacity={0.8}
              disabled={transcribing}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color="#3d6841" />
              ) : esPremium ? (
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? '#c0392b' : '#3d6841'} />
              ) : (
                <View style={S.micLockWrap}>
                  <Ionicons name="mic" size={20} color="#b1b3a9" />
                  <View style={S.micLockBadge}>
                    <Ionicons name="lock-closed" size={8} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
            {!result && (
              <TouchableOpacity
                style={[S.btnPill, (loading || text.trim().length < 10) && S.btnDisabled]}
                onPress={handleAnalizar}
                disabled={loading || text.trim().length < 10}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#e4ffe0" />
                  : <Text style={S.btnPillText}>Reflejar</Text>
                }
              </TouchableOpacity>
            )}
            {result && (
              <TouchableOpacity style={S.btnPillSec} onPress={handleNuevaEntrada} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color="#3d6841" />
                <Text style={S.btnPillSecText}>Nueva</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Resultado análisis ── */}
        {result && (
          <>
            {/* Sección: Perspectivas Emocionales */}
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>Perspectivas emocionales</Text>
            </View>

            {/* Card emociones — barras */}
            <View style={S.cardSoft}>
              {result.emociones.map(e => (
                <View key={e.label} style={S.emotionRow}>
                  <View style={S.emotionLabelRow}>
                    <Text style={S.emotionLabel}>{e.label}</Text>
                    <Text style={S.emotionVal}>{e.valor}%</Text>
                  </View>
                  <View style={S.emotionBarBg}>
                    <View style={[S.emotionBar, { width: `${e.valor}%` as any, backgroundColor: e.color }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Card reflexión — verde */}
            <View style={S.reflexionCard}>
              <Text style={S.reflexionLabel}>REFLEXIÓN PRINCIPAL</Text>
              <Text style={S.reflexionText}>{result.reflexion}</Text>
            </View>

            {/* Acciones identificadas */}
            <View style={S.cardSoft}>
              <Text style={S.cardLabel}>ACCIONES IDENTIFICADAS</Text>
              <View style={S.pillsRow}>
                {result.acciones.map((a, i) => {
                  const tipo = result.accionTipos[i] ?? 'mist';
                  const ps = PILL_STYLES[tipo];
                  return (
                    <View key={i} style={[S.pill, { backgroundColor: ps.bg }]}>
                      <Text style={[S.pillText, { color: ps.color }]}>{a}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Observación editorial */}
            <View style={S.observacionCard}>
              <Ionicons name="bulb-outline" size={16} color="#5e6058" style={{ marginBottom: 6 }} />
              <Text style={S.observacionText}>{result.observacion}</Text>
            </View>

            {/* Consejo */}
            <View style={S.consejoCard}>
              <Text style={S.consejoLabel}>CONSEJO PARA TI</Text>
              <Text style={S.consejoText}>{result.consejo}</Text>
            </View>

            <TouchableOpacity
              style={[S.btnGuardarConsejo, consejoGuardado && S.btnGuardarConsejoGuardado]}
              onPress={handleGuardarConsejo}
              activeOpacity={0.75}
              disabled={consejoGuardado}
            >
              <Ionicons
                name={consejoGuardado ? 'checkmark-circle' : (esPremium ? 'bookmark-outline' : 'lock-closed-outline')}
                size={16}
                color={consejoGuardado ? '#3d6841' : '#675e4d'}
              />
              <Text style={[S.btnGuardarConsejoText, consejoGuardado && { color: '#3d6841' }]}>
                {consejoGuardado ? 'Consejo guardado' : 'Guardar este consejo'}
              </Text>
            </TouchableOpacity>
          </>
        )}

      </View>

      {celebracion && (
        <CelebracionEtapa
          visible={!!celebracion}
          etapa={celebracion.etapa}
          plantaId={celebracion.plantaId}
          onClose={() => setCelebracion(null)}
        />
      )}
      <LogroModal logro={logros[logroIdx] ?? null} onClose={cerrarLogro} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },
  content:      { paddingBottom: 48 },

  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },

  section:      { paddingHorizontal: 24, paddingTop: 16, gap: 20 },

  heroLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, marginBottom: -8 },
  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#31332c', letterSpacing: -0.8, lineHeight: 42 },

  inputCard:    { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  inputLabel:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', marginBottom: 12 },
  inputBig:     { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#31332c', lineHeight: 24, minHeight: 160, textAlignVertical: 'top' },
  inputDivider: { height: 0.5, backgroundColor: '#efeee6', marginVertical: 16 },
  inputFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  micBtn:            { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f4ed', alignItems: 'center', justifyContent: 'center' },
  micBtnActive:      { backgroundColor: '#fde8e8' },
  micLockWrap:       { position: 'relative', width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  micLockBadge:      { position: 'absolute', bottom: -3, right: -5, width: 13, height: 13, borderRadius: 7, backgroundColor: '#797c73', alignItems: 'center', justifyContent: 'center' },

  btnGuardarConsejo:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eee1cc', borderRadius: 9999, paddingVertical: 12, paddingHorizontal: 20 },
  btnGuardarConsejoGuardado:{ backgroundColor: '#bfefbd' },
  btnGuardarConsejoText:    { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#675e4d' },

  btnPill:      { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 12, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', minWidth: 110 },
  btnPillText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#e4ffe0' },
  btnPillSec:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 10, paddingHorizontal: 18 },
  btnPillSecText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#3d6841' },
  btnDisabled:  { opacity: 0.4 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#31332c', letterSpacing: -0.4 },
  sectionTag:   { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#3d6841', letterSpacing: 0.5 },

  cardSoft:     { backgroundColor: '#f5f4ed', borderRadius: 20, padding: 22, gap: 16 },
  cardLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5, marginBottom: 4 },

  emotionRow:   { gap: 8 },
  emotionLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emotionLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#31332c' },
  emotionVal:   { fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#5e6058' },
  emotionBarBg: { height: 8, backgroundColor: '#e2e3d9', borderRadius: 9999, overflow: 'hidden' },
  emotionBar:   { height: 8, borderRadius: 9999 },

  reflexionCard:{ backgroundColor: '#bfefbd', borderRadius: 20, padding: 22 },
  reflexionLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#3d6841', letterSpacing: 1.5, marginBottom: 8 },
  reflexionText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#1e4824', lineHeight: 26, letterSpacing: -0.2 },

  pillsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999 },
  pillText:     { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },

  observacionCard:{ backgroundColor: '#fbf9f4', borderLeftWidth: 3, borderLeftColor: '#797c73', paddingLeft: 16, paddingVertical: 4 },
  observacionText:{ fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', lineHeight: 22, fontStyle: 'italic' },

  consejoCard:  { backgroundColor: '#3d6841', borderRadius: 20, padding: 22 },
  consejoLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#bfefbd', letterSpacing: 1.5, marginBottom: 8 },
  consejoText:  { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e4ffe0', lineHeight: 24, letterSpacing: -0.2 },
});
