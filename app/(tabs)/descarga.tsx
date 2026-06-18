import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { transcribirAudio } from '../../lib/edge';
import { sumarGotas } from '../../lib/planta';
import { LIMITES_TEXTO, superaLimite } from '../../lib/validation';
import { verificarLogros, type Logro } from '../../lib/logros';
import CelebracionEtapa from '../../components/CelebracionEtapa';
import LogroModal from '../../components/LogroModal';
import SentiLogo from '../../components/SentiLogo';

const TAGS: Array<{ id: string; label: string }> = [
  { id: 'enojo',     label: 'Enojo' },
  { id: 'rumiacion', label: 'Rumiación' },
  { id: 'verguenza', label: 'Vergüenza' },
  { id: 'miedo',     label: 'Miedo' },
  { id: 'tristeza',  label: 'Tristeza' },
  { id: 'tarea',     label: 'Tarea pendiente' },
  { id: 'otro',      label: 'Otro' },
];

export default function DescargaScreen() {
  const router = useRouter();
  const [texto, setTexto]             = useState('');
  const [tagsSel, setTagsSel]         = useState<string[]>([]);
  const [guardando, setGuardando]     = useState(false);
  const [guardado, setGuardado]       = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [usedAudio, setUsedAudio]       = useState(false);
  const [celebracion, setCelebracion]   = useState<{ etapa: number; plantaId: string | null } | null>(null);
  const [logros, setLogros]             = useState<Logro[]>([]);
  const [logroIdx, setLogroIdx]         = useState(0);

  function toggleTag(id: string) {
    setTagsSel(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  async function startRecording() {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permiso denegado', 'Senti necesita acceso al micrófono.'); return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (e) { Alert.alert('Error', 'No se pudo iniciar la grabación: ' + String(e)); }
  }

  async function stopRecording() {
    if (!isRecording) return;
    try {
      setTranscribing(true);
      await recorder.stop();
      const uri = recorder.uri;
      setIsRecording(false);
      if (!uri) throw new Error('Sin audio');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión activa');
      const t = await transcribirAudio(uri, session.access_token);
      setTexto(prev => prev.trim() ? `${prev.trim()}\n${t}` : t);
      setUsedAudio(true);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'LIMITE_AUDIO_GRATIS') {
        Alert.alert('Ya usaste tu audio de hoy', 'En el plan gratuito tienes 1 audio al día. Vuelve mañana o escribe directamente.',
          [{ text: 'Entendido', style: 'cancel' }, { text: 'Ver Senti+', onPress: () => router.push('/upgrade') }]);
      } else if (msg === 'LIMITE_AUDIO_PREMIUM') {
        Alert.alert('Límite del día', 'Ya usaste tus 10 audios de hoy. Vuelven mañana.');
      } else {
        Alert.alert('Error al transcribir', msg);
      }
    }
    finally { setTranscribing(false); }
  }

  async function soltar() {
    if (!texto.trim()) return;
    if (superaLimite(texto, 'descarga')) {
      Alert.alert('Texto demasiado largo', `Máximo ${LIMITES_TEXTO.descarga} caracteres.`);
      return;
    }
    setGuardando(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { Alert.alert('Error', 'No hay sesión activa.'); setGuardando(false); return; }

    const tagsLine = tagsSel.length ? `[${tagsSel.join(', ')}]\n\n` : '';
    const textoGuardar = tagsLine + texto.trim();

    const { error } = await supabase.from('journal').insert({
      user_id: userId,
      texto: textoGuardar,
      es_descarga: true,
      via_audio: usedAudio,
      tags: tagsSel.length ? tagsSel : null,
    });
    if (error) { Alert.alert('Error', error.message); setGuardando(false); return; }

    const sumar = await sumarGotas(supabase, userId, 2);
    if (sumar.subio) {
      setCelebracion({ etapa: sumar.etapaDespues, plantaId: sumar.plantaId });
    }

    // Verificar logros
    const nuevosLogros = await verificarLogros(supabase, userId, {
      tipo: 'descarga',
      tags: tagsSel,
      viaAudio: usedAudio,
    });
    if (nuevosLogros.length > 0) {
      setLogros(nuevosLogros);
      setLogroIdx(0);
    }

    setGuardado(true);
    setGuardando(false);
  }

  function nuevaDescarga() {
    setTexto('');
    setTagsSel([]);
    setGuardado(false);
    setUsedAudio(false);
    setCelebracion(null);
    setLogros([]);
    setLogroIdx(0);
  }

  function cerrarLogro() {
    if (logroIdx + 1 < logros.length) {
      setLogroIdx(prev => prev + 1);
    } else {
      setLogros([]);
      setLogroIdx(0);
    }
  }

  // ── Pantalla de confirmación tras guardar ──
  if (guardado) {
    return (
      <View style={S.container}>
        <View style={S.topBar}>
          <View style={S.logoRow}>
            <SentiLogo size={22} />
            <Text style={S.logoText}>Senti</Text>
          </View>
        </View>

        <View style={S.confirmWrap}>
          <View style={S.confirmGlow} />
          <Text style={S.confirmEmoji}>🌬️</Text>
          <Text style={S.confirmLabel}>YA ESTÁ AFUERA</Text>
          <Text style={S.confirmTitle}>Respira.{'\n'}Lo soltaste.</Text>
          <Text style={S.confirmSub}>
            Lo que escribiste se queda aquí, en tu santuario. Nadie más lo verá. Tu planta lo recibió como un riego silencioso.
          </Text>

          <TouchableOpacity style={S.btnNueva} onPress={nuevaDescarga} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#e4ffe0" />
            <Text style={S.btnNuevaText}>Soltar otra cosa</Text>
          </TouchableOpacity>
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
      </View>
    );
  }

  // ── Pantalla principal ──
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
      </View>

      <View style={S.section}>

        {/* Hero editorial */}
        <Text style={S.heroTitle}>Suelta lo que pesa.</Text>
        <Text style={S.heroSub}>
          Lo que sea. Un enojo, un pensamiento que da vueltas, algo que no le puedes decir a nadie. Aquí no hay juicios.
        </Text>

        {/* Card de input grande */}
        <View style={S.inputCard}>
          <TextInput
            style={S.inputBig}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe lo que tienes adentro. Todo lo que digas se queda aquí, en tu santuario."
            placeholderTextColor="#b1b3a9"
            multiline
            textAlignVertical="top"
            maxLength={LIMITES_TEXTO.descarga}
            editable={!guardando && !transcribing}
            scrollEnabled
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          />
          <View style={S.inputFooter}>
            <Text style={S.autoSave}>SOLO TÚ LO LEES</Text>
            <TouchableOpacity
              style={[S.micBtn, isRecording && S.micBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={guardando || transcribing}
              activeOpacity={0.8}
            >
              {transcribing
                ? <ActivityIndicator size="small" color="#3d6841" />
                : <Ionicons name={isRecording ? 'stop' : 'mic'} size={18} color={isRecording ? '#9e422c' : '#3d6841'} />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags opcionales */}
        <View style={S.tagsBlock}>
          <Text style={S.tagsLabel}>¿QUIERES NOMBRARLO? <Text style={S.tagsLabelOpt}>(opcional)</Text></Text>
          <View style={S.tagsRow}>
            {TAGS.map(t => {
              const sel = tagsSel.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[S.tagChip, sel && S.tagChipSel]}
                  onPress={() => toggleTag(t.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[S.tagChipText, sel && S.tagChipTextSel]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Botón soltar */}
        <TouchableOpacity
          style={[S.btnSoltar, (guardando || isRecording || transcribing || !texto.trim()) && S.btnDisabled]}
          onPress={soltar}
          disabled={guardando || isRecording || transcribing || !texto.trim()}
          activeOpacity={0.85}
        >
          {guardando
            ? <ActivityIndicator color="#e4ffe0" />
            : (
              <>
                <Ionicons name="leaf" size={18} color="#e4ffe0" />
                <Text style={S.btnSoltarText}>Soltar</Text>
              </>
            )
          }
        </TouchableOpacity>

        {/* Card editorial — sabiduría */}
        <View style={S.editorialCard}>
          <Text style={S.editorialLabel}>POR QUÉ AYUDA</Text>
          <Text style={S.editorialTitle}>Poner palabras a lo que sientes.</Text>
          <Text style={S.editorialBody}>
            Las investigaciones muestran que nombrar una emoción reduce su intensidad. No tienes que entenderla — basta con sacarla.
          </Text>
        </View>

      </View>
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

  section:      { paddingHorizontal: 24, paddingTop: 20, gap: 24 },

  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: '#31332c', letterSpacing: -0.9, lineHeight: 44 },
  heroSub:      { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', lineHeight: 23, marginTop: -16 },

  inputCard:    { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, minHeight: 280, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  inputBig:     { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#31332c', lineHeight: 24, minHeight: 200, textAlignVertical: 'top' },
  inputFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  autoSave:     { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#b1b3a9', letterSpacing: 1.5 },

  micBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f4ed', alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { backgroundColor: '#fde8e3' },

  tagsBlock:    { gap: 12 },
  tagsLabel:    { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  tagsLabelOpt: { fontFamily: 'Manrope_400Regular', color: '#b1b3a9', letterSpacing: 0.3 },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:      { backgroundColor: '#f5f4ed', borderRadius: 9999, paddingVertical: 10, paddingHorizontal: 16 },
  tagChipSel:   { backgroundColor: '#bfefbd' },
  tagChipText:  { fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#5e6058' },
  tagChipTextSel:{ fontFamily: 'PlusJakartaSans_700Bold', color: '#1e4824' },

  btnSoltar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16 },
  btnSoltarText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', letterSpacing: 0.3 },
  btnDisabled:  { opacity: 0.4 },

  editorialCard:{ backgroundColor: '#bfefbd', borderRadius: 24, padding: 24, marginTop: 8, gap: 8 },
  editorialLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#3d6841', letterSpacing: 1.8 },
  editorialTitle:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#1e4824', letterSpacing: -0.4, lineHeight: 28, marginTop: 4 },
  editorialBody:{ fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#3d6841', lineHeight: 20, marginTop: 4 },

  // Pantalla de confirmación
  confirmWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  confirmGlow:  { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#bfefbd', opacity: 0.4, top: '20%' },
  confirmEmoji: { fontSize: 80, marginBottom: 16 },
  confirmLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#3d6841', letterSpacing: 2 },
  confirmTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#31332c', textAlign: 'center', lineHeight: 42, letterSpacing: -0.8, marginTop: 12 },
  confirmSub:   { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', textAlign: 'center', lineHeight: 22, marginTop: 16, paddingHorizontal: 16 },

  btnNueva:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 32, marginTop: 40 },
  btnNuevaText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', letterSpacing: 0.3 },
});
