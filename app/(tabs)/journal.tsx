import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';

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
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
}

async function transcribeAudio(uri: string): Promise<string> {
  const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;
  const formData = new FormData();
  formData.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Error transcribiendo');
  return (await res.json()).text as string;
}

async function analyzeWithClaude(text: string): Promise<AnalysisResult> {
  const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `Eres un asistente empático de bienestar emocional. Analiza el texto del diario y responde SOLO con JSON válido, sin texto extra.
Formato exacto:
{
  "reflexion": "reflexión principal en 1-2 frases, segunda persona",
  "acciones": ["tema1", "tema2", "tema3"],
  "accionTipos": ["warm|mist|sage", "warm|mist|sage", "warm|mist|sage"],
  "emociones": [
    {"label": "Estrés", "valor": 0-100, "color": "#C4886A"},
    {"label": "Calma", "valor": 0-100, "color": "#8AB88A"},
    {"label": "Energía", "valor": 0-100, "color": "#C4A86A"}
  ],
  "observacion": "observación empática sobre un patrón detectado, entre comillas",
  "consejo": "consejo accionable y concreto en 2-3 frases, segunda persona"
}
Para accionTipos: warm=situación difícil/estrés, mist=estado mental/emocional, sage=algo positivo/logro.`,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const raw = data.content[0].text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Respuesta inválida de Claude');
  return JSON.parse(match[0]) as AnalysisResult;
}

const PILL_STYLES: Record<PillTipo, { bg: string; color: string }> = {
  warm: { bg: '#F5EDE0', color: '#7A4F2E' },
  sage: { bg: '#E8F0E8', color: '#3A5C3A' },
  mist: { bg: '#E8EDF5', color: '#2E4A6A' },
};

export default function JournalScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const isRecording = !!recording;

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permiso denegado', 'Senti necesita acceso al micrófono.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch { Alert.alert('Error', 'No se pudo iniciar la grabación.'); }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      setTranscribing(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('Sin audio');
      const transcription = await transcribeAudio(uri);
      setText(prev => prev.trim() ? `${prev.trim()}\n${transcription}` : transcription);
    } catch { Alert.alert('Error al transcribir', 'Intenta de nuevo.'); }
    finally { setTranscribing(false); }
  }

  async function handleAnalizar() {
    if (text.trim().length < 10) { Alert.alert('Escribe un poco más', 'Cuéntame cómo te sientes hoy.'); return; }
    setLoading(true); setResult(null);
    try {
      const analysis = await analyzeWithClaude(text);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { Alert.alert('Error', 'No hay sesión activa.'); return; }

      const stress  = analysis.emociones.find(e => e.label === 'Estrés')?.valor  ?? 0;
      const calm    = analysis.emociones.find(e => e.label === 'Calma')?.valor   ?? 0;
      const energy  = analysis.emociones.find(e => e.label === 'Energía')?.valor ?? 0;

      await supabase.from('journal').insert({
        user_id: userId,
        texto:   text,
      });

      // Sumar 3 puntos
      const { data: planta } = await supabase
        .from('plantas_usuario')
        .select('puntos')
        .eq('user_id', userId)
        .single();
      if (planta) {
        await supabase
          .from('plantas_usuario')
          .update({ puntos: planta.puntos + 3 })
          .eq('user_id', userId);
      }

      setResult(analysis);
    } catch (e: any) { Alert.alert('Algo salió mal', e?.message ?? String(e)); }
    finally { setLoading(false); }
  }

  function handleNuevaEntrada() { setText(''); setResult(null); }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">

      {/* TopBar logo */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <Text style={S.logoEmoji}>🌿</Text>
          <Text style={S.logoText}>Senti</Text>
        </View>
        <Text style={S.subtitle}>{todayHeader()} · ¿Cómo fue tu día?</Text>
      </View>

      <View style={S.section}>
        {/* Input */}
        <TextInput
          style={S.input}
          placeholder="¿Qué hay en tu mente hoy?"
          placeholderTextColor="#A09890"
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
          editable={!loading && !result && !transcribing}
        />

        {/* Botones acción */}
        {!result && (
          <View style={S.actionRow}>
            <TouchableOpacity
              style={[S.btnSm, isRecording && S.btnSmRecording]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              activeOpacity={0.8}
            >
              {transcribing
                ? <ActivityIndicator size="small" color="#6B6560" />
                : <Text style={S.btnSmText}>{isRecording ? 'Detener ⏹' : 'Grabar audio'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btnSm, S.btnMain, (loading || isRecording || transcribing) && S.btnDisabled]}
              onPress={handleAnalizar}
              disabled={loading || isRecording || transcribing}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#3D2E1E" />
                : <Text style={[S.btnSmText, S.btnMainText]}>Analizar</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Resultado análisis */}
        {result && (
          <>
            {/* Card análisis */}
            <View style={S.card}>
              <Text style={S.cardTitle}>Análisis del día</Text>

              <Text style={S.secLabel}>Reflexión principal</Text>
              <Text style={S.reflexionText}>{result.reflexion}</Text>

              <Text style={[S.secLabel, { marginTop: 10 }]}>Acciones identificadas</Text>
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

            {/* Card emociones */}
            <View style={S.card}>
              <Text style={S.cardTitle}>Estado emocional</Text>
              {result.emociones.map(e => (
                <View key={e.label} style={S.emotionRow}>
                  <Text style={S.emotionLabel}>{e.label}</Text>
                  <View style={S.emotionBarBg}>
                    <View style={[S.emotionBar, { width: `${e.valor}%` as any, backgroundColor: e.color }]} />
                  </View>
                  <Text style={S.emotionVal}>{e.valor}</Text>
                </View>
              ))}
            </View>

            {/* Observación AI */}
            <View style={S.aiObs}>
              <Text style={S.aiObsText}>{result.observacion}</Text>
            </View>

            {/* Consejo */}
            <View style={S.aiTip}>
              <Text style={S.aiTipLabel}>Consejo para ti</Text>
              <Text style={S.aiTipText}>{result.consejo}</Text>
            </View>

            <TouchableOpacity style={S.btnNueva} onPress={handleNuevaEntrada} activeOpacity={0.8}>
              <Text style={S.btnNuevaText}>+ Nueva entrada</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F7F5F0' },
  content:       { paddingBottom: 32 },
  topBar:        { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#E4E0D6' },
  logoRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji:     { fontSize: 18 },
  logoText:      { fontSize: 18, fontWeight: '700', color: '#31332c' },
  subtitle:      { fontSize: 11, color: '#A09890', marginTop: 4 },
  section:       { padding: 14, paddingHorizontal: 20 },

  input:         { backgroundColor: '#F0EDE6', borderRadius: 12, padding: 12, paddingHorizontal: 14, fontSize: 12, color: '#2C2820', minHeight: 90, lineHeight: 18, marginBottom: 10 },

  actionRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  btnSm:         { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: '#D8D4C8', backgroundColor: '#fff', alignItems: 'center' },
  btnSmRecording:{ backgroundColor: '#FFE8E8', borderColor: '#E08080' },
  btnSmText:     { fontSize: 11, fontWeight: '500', color: '#6B6560' },
  btnMain:       { backgroundColor: '#C8BCA8', borderWidth: 0 },
  btnMainText:   { color: '#3D2E1E' },
  btnDisabled:   { opacity: 0.6 },

  card:          { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E4E0D6', borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle:     { fontSize: 11, fontWeight: '500', color: '#2C2820', marginBottom: 8 },
  secLabel:      { fontSize: 10, color: '#A09890', marginBottom: 5, letterSpacing: 0.3 },
  reflexionText: { fontSize: 11, color: '#4A4540', lineHeight: 17 },

  pillsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  pill:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText:      { fontSize: 11, fontWeight: '500' },

  emotionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emotionLabel:  { fontSize: 10, color: '#7A7570', width: 52 },
  emotionBarBg:  { flex: 1, height: 5, backgroundColor: '#EDE9E0', borderRadius: 3 },
  emotionBar:    { height: 5, borderRadius: 3 },
  emotionVal:    { fontSize: 10, color: '#7A7570', width: 22, textAlign: 'right' },

  aiObs:         { backgroundColor: '#F0EDE6', borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, borderBottomLeftRadius: 12, padding: 10, paddingHorizontal: 12, marginBottom: 8 },
  aiObsText:     { fontSize: 11, color: '#5A5248', lineHeight: 17 },

  aiTip:         { backgroundColor: '#E8F0E8', borderLeftWidth: 2, borderLeftColor: '#8AB88A', borderTopRightRadius: 12, borderBottomRightRadius: 12, borderBottomLeftRadius: 12, padding: 10, paddingHorizontal: 12, marginBottom: 14 },
  aiTipLabel:    { fontSize: 9, fontWeight: '500', color: '#6A9A6A', letterSpacing: 0.4, marginBottom: 4 },
  aiTipText:     { fontSize: 11, color: '#3A5C3A', lineHeight: 17 },

  btnNueva:      { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  btnNuevaText:  { fontSize: 13, color: '#8AB88A', fontWeight: '500' },
});
