import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';

const USER_ID = 'usuario_prueba';

type Gratitud = { id: string; texto: string; created_at: string };
type AudioField = 'momento' | 'persona' | 'victoria';

function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

function calcularRacha(entradas: Gratitud[]): number {
  if (!entradas.length) return 0;
  const dias = new Set(entradas.map(e => new Date(e.created_at).toDateString()));
  let racha = 0;
  const hoy = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i);
    if (dias.has(d.toDateString())) racha++; else break;
  }
  return racha;
}

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

export default function GratitudScreen() {
  const [momento, setMomento]   = useState('');
  const [persona, setPersona]   = useState('');
  const [victoria, setVictoria] = useState('');
  const [todas, setTodas]       = useState<Gratitud[]>([]);
  const [semana, setSemana]     = useState<Gratitud[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [racha, setRacha]       = useState(0);
  const [recording, setRecording] = useState<{ field: AudioField; rec: Audio.Recording } | null>(null);
  const [transcribing, setTranscribing] = useState<AudioField | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from('gratitudes').select('id, texto, created_at')
      .eq('user_id', USER_ID).order('created_at', { ascending: false }).limit(100);
    if (data) {
      setTodas(data); setRacha(calcularRacha(data));
      setSemana(data.filter(e => e.created_at >= startOfWeek()));
    }
    setCargando(false);
  }

  async function startRecording(field: AudioField) {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permiso denegado', 'Senti necesita acceso al micrófono.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording({ field, rec });
    } catch { Alert.alert('Error', 'No se pudo iniciar la grabación.'); }
  }

  async function stopRecording() {
    if (!recording) return;
    const { field, rec } = recording;
    try {
      setTranscribing(field);
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI(); setRecording(null);
      if (!uri) throw new Error('Sin audio');
      const t = await transcribeAudio(uri);
      if (field === 'momento') setMomento(prev => prev.trim() ? `${prev.trim()} ${t}` : t);
      if (field === 'persona') setPersona(prev => prev.trim() ? `${prev.trim()} ${t}` : t);
      if (field === 'victoria') setVictoria(prev => prev.trim() ? `${prev.trim()} ${t}` : t);
    } catch { Alert.alert('Error al transcribir', 'Intenta de nuevo.'); }
    finally { setTranscribing(null); }
  }

  async function guardar() {
    if (!momento.trim() && !persona.trim() && !victoria.trim()) return;
    setGuardando(true);
    const partes: string[] = [];
    if (momento.trim())  partes.push(`Momento: ${momento.trim()}`);
    if (persona.trim())  partes.push(`Persona: ${persona.trim()}`);
    if (victoria.trim()) partes.push(`Victoria: ${victoria.trim()}`);
    const texto = partes.join('\n');
    const { data, error } = await supabase.from('gratitudes')
      .insert({ user_id: USER_ID, texto })
      .select('id, texto, created_at').single();
    if (error) { Alert.alert('Error', 'No se pudo guardar.'); }
    else if (data) {
      const updated = [data, ...todas];
      setTodas(updated); setRacha(calcularRacha(updated));
      setSemana(updated.filter(e => e.created_at >= startOfWeek()));
      setMomento(''); setPersona(''); setVictoria('');
    }
    setGuardando(false);
  }

  const mesCount = todas.filter(e => e.created_at >= startOfMonth()).length;
  const isAnyRecording = !!recording;

  function AudioBtn({ field }: { field: AudioField }) {
    const isThis = recording?.field === field;
    const isTranscribing = transcribing === field;
    return (
      <TouchableOpacity
        style={[S.audioBtn, isThis && S.audioBtnActive]}
        onPress={isThis ? stopRecording : () => startRecording(field)}
        disabled={isTranscribing || (!isThis && isAnyRecording)}
        activeOpacity={0.7}
      >
        {isTranscribing
          ? <ActivityIndicator size="small" color="#6B6560" />
          : <Text style={S.audioBtnIcon}>{isThis ? '⏹' : '🎙'}</Text>
        }
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">

      {/* TopBar logo */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <Text style={S.logoEmoji}>🌿</Text>
          <Text style={S.logoText}>Senti</Text>
        </View>
        <Text style={S.subtitle}>Lo bueno de hoy</Text>
      </View>

      <View style={S.section}>

        {/* Racha */}
        <View style={S.streak}>
          <Text style={S.streakNum}>{racha}</Text>
          <Text style={S.streakText}>días seguidos{'\n'}anotando gratitud</Text>
        </View>

        {/* Anchor 1 */}
        <Text style={S.secLabel}>Un momento que disfrutaste</Text>
        <View style={S.inputRow}>
          <TextInput
            style={[S.input, S.inputFlex]}
            value={momento}
            onChangeText={setMomento}
            placeholder="Hoy disfruté..."
            placeholderTextColor="#A09890"
            multiline
            textAlignVertical="top"
            editable={!guardando && !transcribing}
          />
          <AudioBtn field="momento" />
        </View>

        {/* Anchor 2 */}
        <Text style={S.secLabel}>Alguien que agradeces</Text>
        <View style={S.inputRow}>
          <TextInput
            style={[S.input, S.inputFlex]}
            value={persona}
            onChangeText={setPersona}
            placeholder="Hoy agradezco a..."
            placeholderTextColor="#A09890"
            multiline
            textAlignVertical="top"
            editable={!guardando && !transcribing}
          />
          <AudioBtn field="persona" />
        </View>

        {/* Anchor 3 */}
        <Text style={S.secLabel}>Una victoria personal</Text>
        <View style={S.inputRow}>
          <TextInput
            style={[S.input, S.inputFlex]}
            value={victoria}
            onChangeText={setVictoria}
            placeholder="Hoy logré..."
            placeholderTextColor="#A09890"
            multiline
            textAlignVertical="top"
            editable={!guardando && !transcribing}
          />
          <AudioBtn field="victoria" />
        </View>

        {/* Guardar */}
        <TouchableOpacity
          style={[S.btnMain, (guardando || isAnyRecording) && S.btnDisabled]}
          onPress={guardar}
          disabled={guardando || isAnyRecording}
          activeOpacity={0.85}
        >
          {guardando
            ? <ActivityIndicator color="#3D2E1E" />
            : <Text style={S.btnMainText}>Guardar momento</Text>
          }
        </TouchableOpacity>

        {/* Semana pasada — resumen compacto */}
        <Text style={S.secLabel}>Semana pasada</Text>
        <View style={S.card}>
          {cargando
            ? <ActivityIndicator color="#8AB88A" />
            : semana.length === 0
              ? <Text style={S.emptyText}>Aún no hay entradas esta semana</Text>
              : (
                <View style={S.semanaCompact}>
                  <Text style={S.semanaResumen}>
                    {semana.length} {semana.length === 1 ? 'momento anotado' : 'momentos anotados'} esta semana
                  </Text>
                  <View style={S.semanaDots}>
                    {semana.slice(0, 7).map((_, i) => (
                      <View key={i} style={S.semanaDot} />
                    ))}
                  </View>
                </View>
              )
          }
        </View>
        <TouchableOpacity style={S.btnHistorial} activeOpacity={0.8}>
          <Text style={S.btnHistorialText}>Ver historial ({mesCount} este mes) →</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F5F0' },
  content:          { paddingBottom: 32 },
  topBar:           { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#E4E0D6' },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji:        { fontSize: 18 },
  logoText:         { fontSize: 18, fontWeight: '700', color: '#31332c' },
  subtitle:         { fontSize: 11, color: '#A09890', marginTop: 4 },
  section:          { padding: 14, paddingHorizontal: 20 },

  streak:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FDF8F0', borderWidth: 0.5, borderColor: '#E8D4A8', borderRadius: 12, padding: 10, paddingHorizontal: 14, marginBottom: 14 },
  streakNum:        { fontSize: 20, fontWeight: '500', color: '#C4A86A' },
  streakText:       { fontSize: 10, color: '#6B6560', lineHeight: 16 },

  secLabel:         { fontSize: 10, color: '#A09890', marginBottom: 6, letterSpacing: 0.3, marginTop: 4 },

  inputRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  inputFlex:        { flex: 1 },
  input:            { backgroundColor: '#F0EDE6', borderRadius: 12, padding: 12, paddingHorizontal: 14, fontSize: 11, color: '#2C2820', minHeight: 52, lineHeight: 17 },

  audioBtn:         { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0EDE6', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#D8D4C8', flexShrink: 0 },
  audioBtnActive:   { backgroundColor: '#FFE8E8', borderColor: '#E08080' },
  audioBtnIcon:     { fontSize: 17 },

  btnMain:          { backgroundColor: '#C8BCA8', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 16, marginTop: 4 },
  btnDisabled:      { opacity: 0.6 },
  btnMainText:      { color: '#3D2E1E', fontSize: 11, fontWeight: '500' },

  card:             { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E4E0D6', borderRadius: 14, padding: 14, marginBottom: 8 },
  emptyText:        { fontSize: 11, color: '#A09890', fontStyle: 'italic' },

  semanaCompact:    { gap: 8 },
  semanaResumen:    { fontSize: 12, color: '#3A3530', fontWeight: '500' },
  semanaDots:       { flexDirection: 'row', gap: 4 },
  semanaDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4A86A' },

  btnHistorial:     { backgroundColor: '#FDF8F0', borderWidth: 0.5, borderColor: '#E8D4A8', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  btnHistorialText: { fontSize: 11, fontWeight: '500', color: '#7A5A20' },
});
