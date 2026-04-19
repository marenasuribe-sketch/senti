import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';

type Tarea = { id: string; texto: string; tag: 'trabajo' | 'personal'; hecha: boolean };

const STEP_TITLES = ['Liberar', 'Tus tareas de hoy', 'Tu foco del día'];

const TAREAS_INIT: Tarea[] = [
  { id: '1', texto: 'Revisar emails pendientes',    tag: 'trabajo',  hecha: false },
  { id: '2', texto: 'Preparar presentación',         tag: 'trabajo',  hecha: false },
  { id: '3', texto: 'Llamar al médico',              tag: 'personal', hecha: false },
  { id: '4', texto: 'Ir al gimnasio',                tag: 'personal', hecha: false },
];

async function transcribeAudio(uri: string): Promise<string> {
  const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;
  const formData = new FormData();
  formData.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}` }, body: formData,
  });
  if (!res.ok) throw new Error('Error transcribiendo');
  return (await res.json()).text as string;
}

export default function DescargaScreen() {
  const [step, setStep]         = useState(0);
  const [texto, settexto]       = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [tareas, setTareas]     = useState<Tarea[]>(TAREAS_INIT);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [recording, setRecording]   = useState<Audio.Recording | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const isRecording = !!recording;
  const tareasIncompletas = tareas.filter(t => !t.hecha);
  const tareasFoco = tareasIncompletas.slice(0, 2);

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
      const uri = recording.getURI(); setRecording(null);
      if (!uri) throw new Error('Sin audio');
      const t = await transcribeAudio(uri);
      settexto(prev => prev.trim() ? `${prev.trim()}\n${t}` : t);
    } catch { Alert.alert('Error al transcribir', 'Intenta de nuevo.'); }
    finally { setTranscribing(false); }
  }

  async function handleListo() {
    if (!guardado && texto.trim()) {
      setGuardando(true);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { Alert.alert('Error', 'No hay sesión activa.'); setGuardando(false); return; }

      await supabase.from('journal').insert({
        user_id: userId,
        texto: texto.trim(),
      });

      // Sumar 2 puntos
      const { data: planta } = await supabase
        .from('plantas_usuario').select('puntos').eq('user_id', userId).single();
      if (planta) {
        await supabase.from('plantas_usuario')
          .update({ puntos: planta.puntos + 2 }).eq('user_id', userId);
      }

      setGuardado(true); setGuardando(false);
    }
    setStep(1);
  }

  function toggleTarea(id: string) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, hecha: !t.hecha } : t));
  }

  function agregarTarea() {
    if (!nuevaTarea.trim()) return;
    setTareas(prev => [...prev, { id: Date.now().toString(), texto: nuevaTarea.trim(), tag: 'personal', hecha: false }]);
    setNuevaTarea('');
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">

      {/* TopBar logo */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <Text style={S.logoEmoji}>🌿</Text>
          <Text style={S.logoText}>Senti</Text>
        </View>
        <Text style={S.subtitle}>{STEP_TITLES[step]}</Text>

        {/* Step dots */}
        <View style={S.stepDots}>
          {[0, 1, 2].map(i => <View key={i} style={[S.stepDot, step === i && S.stepDotActive]} />)}
        </View>

        {/* Botón urgente — solo en step 0 */}
        {step === 0 && (
          <TouchableOpacity style={S.btnUrgente} activeOpacity={0.85}>
            <Text style={S.btnUrgenteText}>Necesito descargarme ya 🌊</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={S.section}>

        {/* ── Step 0: Descarga ── */}
        {step === 0 && (
          <>
            <Text style={S.secLabel}>¿Qué está dando vueltas en tu cabeza?</Text>
            <View style={S.inputRow}>
              <TextInput
                style={[S.input, S.inputFlex]}
                value={texto}
                onChangeText={settexto}
                placeholder="Estoy pensando en..."
                placeholderTextColor="#A09890"
                multiline
                textAlignVertical="top"
                editable={!guardando && !transcribing}
              />
              <TouchableOpacity
                style={[S.audioBtn, isRecording && S.audioBtnActive]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={guardando || transcribing}
                activeOpacity={0.7}
              >
                {transcribing
                  ? <ActivityIndicator size="small" color="#6B6560" />
                  : <Text style={S.audioBtnIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                }
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[S.btnMain, (guardando || isRecording || transcribing) && S.btnDisabled]}
              onPress={handleListo}
              disabled={guardando || isRecording || transcribing}
              activeOpacity={0.85}
            >
              {guardando
                ? <ActivityIndicator color="#3D2E1E" />
                : <Text style={S.btnMainText}>Listo →</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 1: Tareas ── */}
        {step === 1 && (
          <>
            <Text style={S.secLabel}>¿Qué tareas tienes hoy?</Text>
            <View style={[S.card, { paddingHorizontal: 14, paddingVertical: 10 }]}>
              {tareas.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={S.tareaRow}
                  onPress={() => toggleTarea(t.id)}
                  activeOpacity={0.7}
                >
                  <View style={[S.check, t.hecha && S.checkDone]} />
                  <Text style={[S.tareaText, t.hecha && S.tareaTextDone]} numberOfLines={1}>{t.texto}</Text>
                  <View style={[S.tag, t.tag === 'trabajo' ? S.tagWork : S.tagPers]}>
                    <Text style={[S.tagText, t.tag === 'trabajo' ? S.tagWorkText : S.tagPersText]}>{t.tag}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={S.nuevaTareaRow}>
                <TextInput
                  style={S.nuevaTareaInput}
                  value={nuevaTarea}
                  onChangeText={setNuevaTarea}
                  placeholder="+ Agregar tarea"
                  placeholderTextColor="#8AB88A"
                  onSubmitEditing={agregarTarea}
                  returnKeyType="done"
                />
              </View>
            </View>
            <TouchableOpacity
              style={S.btnMain}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={S.btnMainText}>Ver qué basta hacer hoy →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Foco ── */}
        {step === 2 && (
          <>
            <View style={S.focoCard}>
              <Text style={S.focoLabel}>Solo basta hacer esto hoy</Text>
              {tareasFoco.length > 0
                ? tareasFoco.map(t => (
                    <View key={t.id} style={S.focoItem}>
                      <View style={S.focoDot} />
                      <Text style={S.focoText}>{t.texto}</Text>
                    </View>
                  ))
                : <Text style={S.focoText}>¡Ya tienes todo hecho! Disfruta el día.</Text>
              }
              {tareasIncompletas.length > 2 && (
                <Text style={S.focoNote}>
                  Las otras {tareasIncompletas.length - 2} tareas pueden esperar. El foco de hoy es lo que importa.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={S.btnReset}
              onPress={() => { setStep(0); setGuardado(false); settexto(''); }}
              activeOpacity={0.8}
            >
              <Text style={S.btnResetText}>Nueva descarga</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F7F5F0' },
  content:         { paddingBottom: 32 },

  topBar:          { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#E4E0D6', gap: 6 },
  logoRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji:       { fontSize: 18 },
  logoText:        { fontSize: 18, fontWeight: '700', color: '#31332c' },
  subtitle:        { fontSize: 11, color: '#A09890' },

  stepDots:        { flexDirection: 'row', gap: 5, paddingTop: 4 },
  stepDot:         { width: 20, height: 3, borderRadius: 2, backgroundColor: '#D0D8E8' },
  stepDotActive:   { backgroundColor: '#8AB88A' },

  btnUrgente:      { backgroundColor: '#F5EDE8', borderWidth: 1, borderColor: '#D4A090', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20, alignSelf: 'flex-start', marginTop: 2 },
  btnUrgenteText:  { fontSize: 12, fontWeight: '600', color: '#8A4030' },

  section:         { paddingHorizontal: 20, paddingTop: 14 },
  secLabel:        { fontSize: 10, color: '#A09890', marginBottom: 6, letterSpacing: 0.3 },

  inputRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  inputFlex:       { flex: 1 },
  input:           { backgroundColor: '#F0EDE6', borderRadius: 12, padding: 12, paddingHorizontal: 14, fontSize: 11, color: '#2C2820', minHeight: 80, lineHeight: 17 },

  audioBtn:        { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0EDE6', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#D8D4C8', flexShrink: 0 },
  audioBtnActive:  { backgroundColor: '#FFE8E8', borderColor: '#E08080' },
  audioBtnIcon:    { fontSize: 17 },

  btnMain:         { backgroundColor: '#C8BCA8', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  btnDisabled:     { opacity: 0.6 },
  btnMainText:     { color: '#3D2E1E', fontSize: 11, fontWeight: '500' },

  card:            { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E4E0D6', borderRadius: 14, marginBottom: 10 },
  tareaRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE6' },
  check:           { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: '#C8BCA8', flexShrink: 0 },
  checkDone:       { backgroundColor: '#C8BCA8', borderColor: '#C8BCA8' },
  tareaText:       { flex: 1, fontSize: 11, color: '#4A4540' },
  tareaTextDone:   { color: '#A09890', textDecorationLine: 'line-through' },
  tag:             { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tagWork:         { backgroundColor: '#E8EDF5' },
  tagPers:         { backgroundColor: '#F5EDE0' },
  tagText:         { fontSize: 9, fontWeight: '500' },
  tagWorkText:     { color: '#2E4A6A' },
  tagPersText:     { color: '#7A4F2E' },
  nuevaTareaRow:   { paddingVertical: 8 },
  nuevaTareaInput: { fontSize: 11, color: '#2C2820', padding: 0 },

  focoCard:        { backgroundColor: '#F0F5F0', borderWidth: 0.5, borderColor: '#B8D4B8', borderRadius: 14, padding: 14, marginBottom: 14 },
  focoLabel:       { fontSize: 9, fontWeight: '500', color: '#5A8A5A', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  focoItem:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  focoDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8AB88A', flexShrink: 0, marginTop: 3 },
  focoText:        { fontSize: 11, color: '#3A3530', lineHeight: 17, flex: 1 },
  focoNote:        { fontSize: 10, color: '#7A9A7A', marginTop: 6 },

  btnReset:        { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  btnResetText:    { fontSize: 13, color: '#8AB88A', fontWeight: '500' },
});
