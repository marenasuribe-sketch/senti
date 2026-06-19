import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { supabase } from '../../lib/supabase';
import { transcribirAudio } from '../../lib/edge';
import { sumarGotas } from '../../lib/planta';
import { LIMITES_TEXTO, superaLimite } from '../../lib/validation';
import { verificarLogros, type Logro } from '../../lib/logros';
import { usePremium } from '../../hooks/usePremium';
import SentiLogo from '../../components/SentiLogo';
import CelebracionEtapa from '../../components/CelebracionEtapa';
import LogroModal from '../../components/LogroModal';
import AvisoSenti, { AvisoConfig } from '../../components/AvisoSenti';

type Gratitud = { id: string; texto: string; created_at: string };
type Campo = 'momento' | 'persona' | 'victoria';

function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
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

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase().replace('.', '');
}

function resumenEntrada(texto: string): string {
  const partes = texto.split('\n').map(p => p.replace(/^(Momento|Persona|Victoria):\s*/, '').trim()).filter(Boolean);
  return partes.join(' · ');
}

export default function GratitudScreen() {
  const router = useRouter();
  const { esPremium } = usePremium();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [momento, setMomento]   = useState('');
  const [persona, setPersona]   = useState('');
  const [victoria, setVictoria] = useState('');
  const [todas, setTodas]       = useState<Gratitud[]>([]);
  const [semana, setSemana]     = useState<Gratitud[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<AvisoConfig | null>(null);
  const [racha, setRacha]       = useState(0);
  const [grabandoCampo, setGrabandoCampo] = useState<Campo | null>(null);
  const [transcribing, setTranscribing]   = useState(false);

  const [celebracion, setCelebracion] = useState<{ etapa: number; plantaId: string | null } | null>(null);
  const [logros, setLogros]           = useState<Logro[]>([]);
  const [logroIdx, setLogroIdx]       = useState(0);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { setCargando(false); return; }
    const { data } = await supabase
      .from('gratitudes').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    if (data) {
      setTodas(data); setRacha(calcularRacha(data));
      setSemana(data.filter(e => e.created_at >= startOfWeek()));
    }
    setCargando(false);
  }

  const setters: Record<Campo, (v: string) => void> = {
    momento: setMomento,
    persona: setPersona,
    victoria: setVictoria,
  };

  async function handleMic(campo: Campo) {
    if (!esPremium) {
      setAviso({
        titulo: 'Audio en Gratitud',
        mensaje: 'Con Senti+ puedes dictar tus gratitudes por voz en cualquier campo.',
        icono: 'lock-closed', iconoBg: '#eee1cc', iconoColor: '#595141',
        botones: [
          { texto: 'Conocer Senti+', variante: 'primario', onPress: () => router.push('/upgrade') },
          { texto: 'Ahora no', variante: 'secundario' },
        ],
      });
      return;
    }
    if (grabandoCampo === campo) {
      // Detener y transcribir
      try {
        setTranscribing(true);
        await recorder.stop();
        const uri = recorder.uri;
        setGrabandoCampo(null);
        if (!uri) throw new Error('Sin audio');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sin sesión');
        const t = await transcribirAudio(uri, session.access_token);
        const setter = setters[campo];
        setter(t);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        if (msg === 'LIMITE_AUDIO_GRATIS' || msg === 'LIMITE_AUDIO_PREMIUM') {
          setAviso({ titulo: 'Límite de audio', mensaje: 'Ya usaste todos tus audios de hoy.', icono: 'time-outline' });
        } else {
          setAviso({ titulo: 'No se pudo transcribir', mensaje: msg, icono: 'alert-circle-outline' });
        }
      } finally { setTranscribing(false); }
    } else {
      // Iniciar grabación
      if (grabandoCampo) {
        await recorder.stop(); // parar el campo anterior si hay
      }
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { setAviso({ titulo: 'Permiso denegado', mensaje: 'Senti necesita acceso al micrófono para grabar tu voz.', icono: 'mic-off-outline' }); return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setGrabandoCampo(campo);
    }
  }

  async function guardar() {
    if (!momento.trim() && !persona.trim() && !victoria.trim()) return;
    if (superaLimite(momento, 'gratitud') || superaLimite(persona, 'gratitud') || superaLimite(victoria, 'gratitud')) {
      setAviso({ titulo: 'Texto demasiado largo', mensaje: `Cada campo tiene un máximo de ${LIMITES_TEXTO.gratitud} caracteres.`, icono: 'create-outline' });
      return;
    }
    setGuardando(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { setAviso({ titulo: 'No hay sesión activa', mensaje: 'Vuelve a iniciar sesión para guardar tus gratitudes.', icono: 'alert-circle-outline' }); setGuardando(false); return; }

    const partes: string[] = [];
    if (momento.trim())  partes.push(`Momento: ${momento.trim()}`);
    if (persona.trim())  partes.push(`Persona: ${persona.trim()}`);
    if (victoria.trim()) partes.push(`Victoria: ${victoria.trim()}`);
    const textoGuardar = partes.join('\n');

    const { data, error } = await supabase.from('gratitudes')
      .insert({ user_id: userId, texto: textoGuardar })
      .select('*').single();

    if (error) { setAviso({ titulo: 'No se pudo guardar', mensaje: error.message, icono: 'alert-circle-outline' }); }
    else if (data) {
      const updated = [data, ...todas];
      setTodas(updated); setRacha(calcularRacha(updated));
      setSemana(updated.filter(e => e.created_at >= startOfWeek()));
      setMomento(''); setPersona(''); setVictoria('');

      const sumar = await sumarGotas(supabase, userId, 2);
      if (sumar.subio) {
        setCelebracion({ etapa: sumar.etapaDespues, plantaId: sumar.plantaId });
      }

      // Verificar logros
      const tresAnclajes = !!(momento.trim() && persona.trim() && victoria.trim());
      const nuevosLogros = await verificarLogros(supabase, userId, {
        tipo: 'gratitud',
        tresAnclajes,
      });
      if (nuevosLogros.length > 0) {
        setLogros(nuevosLogros);
        setLogroIdx(0);
      }
    }
    setGuardando(false);
  }

  function cerrarLogro() {
    if (logroIdx + 1 < logros.length) {
      setLogroIdx(prev => prev + 1);
    } else {
      setLogros([]);
      setLogroIdx(0);
    }
  }

  function MicBtn({ campo }: { campo: Campo }) {
    const activo = grabandoCampo === campo;
    return (
      <TouchableOpacity
        style={[S.micMini, activo && S.micMiniActive]}
        onPress={() => handleMic(campo)}
        activeOpacity={0.7}
        disabled={transcribing}
      >
        {transcribing && grabandoCampo === campo ? (
          <ActivityIndicator size="small" color="#3d6841" />
        ) : esPremium ? (
          <Ionicons name={activo ? 'stop' : 'mic'} size={14} color={activo ? '#c0392b' : '#3d6841'} />
        ) : (
          <View style={S.micLockWrap}>
            <Ionicons name="mic" size={14} color="#b1b3a9" />
            <View style={S.micLockBadge}>
              <Ionicons name="lock-closed" size={7} color="#fff" />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const algoEscrito = momento.trim() || persona.trim() || victoria.trim();

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">

      {/* TopBar */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <SentiLogo size={22} />
          <Text style={S.logoText}>Senti</Text>
        </View>
        <View style={S.rachaChip}>
          <Ionicons name="flame" size={13} color="#9e422c" />
          <Text style={S.rachaChipText}>{racha} {racha === 1 ? 'día' : 'días'}</Text>
        </View>
      </View>

      <View style={S.section}>

        {/* Hero editorial */}
        <Text style={S.heroTitle}>La luz de hoy.</Text>
        <Text style={S.heroSub}>Respira suavemente y nota los pequeños anclajes que te sostuvieron hoy.</Text>

        {/* Card de los 3 anclajes */}
        <View style={S.anclajesCard}>

          <View style={S.anclajeBlock}>
            <View style={S.anclajeLabelRow}>
              <Text style={S.anclajeLabel}>ALGO QUE DISFRUTASTE</Text>
              <MicBtn campo="momento" />
            </View>
            <TextInput
              style={S.anclajeInput}
              value={momento}
              onChangeText={setMomento}
              placeholder="Algo pequeño que te dio alegría…"
              placeholderTextColor="rgba(121,124,115,0.5)"
              multiline
              maxLength={LIMITES_TEXTO.gratitud}
              editable={!guardando}
            />
          </View>

          <View style={S.anclajeBlock}>
            <View style={S.anclajeLabelRow}>
              <Text style={S.anclajeLabel}>ALGUIEN QUE AGRADECES</Text>
              <MicBtn campo="persona" />
            </View>
            <TextInput
              style={S.anclajeInput}
              value={persona}
              onChangeText={setPersona}
              placeholder="Una persona o presencia que agradeces…"
              placeholderTextColor="rgba(121,124,115,0.5)"
              multiline
              maxLength={LIMITES_TEXTO.gratitud}
              editable={!guardando}
            />
          </View>

          <View style={S.anclajeBlock}>
            <View style={S.anclajeLabelRow}>
              <Text style={S.anclajeLabel}>ALGO QUE LOGRASTE</Text>
              <MicBtn campo="victoria" />
            </View>
            <TextInput
              style={S.anclajeInput}
              value={victoria}
              onChangeText={setVictoria}
              placeholder="Una victoria personal o un momento de paz…"
              placeholderTextColor="rgba(121,124,115,0.5)"
              multiline
              maxLength={LIMITES_TEXTO.gratitud}
              editable={!guardando}
            />
          </View>

          <TouchableOpacity
            style={[S.btnGuardar, (guardando || !algoEscrito) && S.btnDisabled]}
            onPress={guardar}
            disabled={guardando || !algoEscrito}
            activeOpacity={0.85}
          >
            {guardando
              ? <ActivityIndicator color="#e4ffe0" />
              : <Text style={S.btnGuardarText}>Guardar reflexiones</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sección semana pasada */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Semana pasada</Text>
          <TouchableOpacity onPress={() => router.push('/historial-gratitud')} activeOpacity={0.7}>
            <Text style={S.sectionLink}>Ver historial →</Text>
          </TouchableOpacity>
        </View>

        {cargando ? (
          <View style={S.loadingBox}><ActivityIndicator color="#3d6841" /></View>
        ) : semana.length === 0 ? (
          <View style={S.emptyCard}>
            <Ionicons name="flower-outline" size={28} color="#797c73" />
            <Text style={S.emptyText}>Aún no hay entradas esta semana.{'\n'}Empieza con una arriba.</Text>
          </View>
        ) : (
          // Una sola card compacta con la última entrada + contador del resto
          <View style={S.ultimaCard}>
            <View style={S.entradaHeader}>
              <Text style={S.entradaFecha}>{fechaCorta(semana[0].created_at)}</Text>
              <Ionicons name="sparkles" size={16} color="#3d6841" />
            </View>
            <Text style={S.entradaTextoDestacada} numberOfLines={3}>
              "{resumenEntrada(semana[0].texto)}"
            </Text>
            {semana.length > 1 && (
              <Text style={S.contadorRestante}>
                + {semana.length - 1} {semana.length - 1 === 1 ? 'entrada más esta semana' : 'entradas más esta semana'}
              </Text>
            )}
          </View>
        )}

        {/* Cápsula mensual (premium teaser) */}
        <View style={S.capsulaCard}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={S.capsulaTitle}>Cápsula mensual</Text>
            <Text style={S.capsulaSub}>Una colección de tus temas y recuerdos más frecuentes del mes.</Text>
            <View style={S.capsulaTag}>
              <Text style={S.capsulaTagText}>PREMIUM</Text>
            </View>
          </View>
          <View style={S.capsulaLock}>
            <Ionicons name="lock-closed" size={20} color="#fff8f0" />
          </View>
        </View>

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
      <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fbf9f4' },
  content:      { paddingBottom: 48 },

  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText:     { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },
  rachaChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5e8e3', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 12 },
  rachaChipText:{ fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#9e422c', letterSpacing: 0.3 },

  section:      { paddingHorizontal: 24, paddingTop: 16, gap: 24 },

  heroTitle:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 44, color: '#31332c', letterSpacing: -1.2, lineHeight: 50 },
  heroSub:      { fontFamily: 'Manrope_400Regular', fontSize: 16, color: '#5e6058', lineHeight: 24, marginTop: -16 },

  anclajesCard: { backgroundColor: '#f5f4ed', borderRadius: 24, padding: 22, gap: 18 },
  anclajeBlock: { gap: 6 },
  anclajeLabelRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  anclajeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  anclajeInput: { backgroundColor: '#e2e3d9', borderRadius: 14, padding: 14, fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#31332c', minHeight: 50, lineHeight: 20, textAlignVertical: 'top' },

  micMini:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fbf9f4', alignItems: 'center', justifyContent: 'center' },
  micMiniActive: { backgroundColor: '#fde8e8' },
  micLockWrap:  { position: 'relative', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  micLockBadge: { position: 'absolute', bottom: -3, right: -5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#797c73', alignItems: 'center', justifyContent: 'center' },

  btnGuardar:   { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnGuardarText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0', letterSpacing: 0.3 },
  btnDisabled:  { opacity: 0.4 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: '#31332c', letterSpacing: -0.4 },
  sectionLink:  { fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#3d6841' },

  loadingBox:   { padding: 24, alignItems: 'center' },
  emptyCard:    { backgroundColor: '#f5f4ed', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  emptyText:    { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#797c73', textAlign: 'center', lineHeight: 20 },

  entradasGrid: { gap: 10 },
  entradaCard:  { backgroundColor: '#ffffff', borderRadius: 16, padding: 18, gap: 10, shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  entradaCardDestacada:{ backgroundColor: '#eee1cc' },
  entradaHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entradaFecha: { fontFamily: 'Manrope_700Bold', fontSize: 10, color: '#797c73', letterSpacing: 1.5 },
  entradaTexto: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', lineHeight: 20 },
  entradaTextoDestacada:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#31332c', fontStyle: 'italic', lineHeight: 24, letterSpacing: -0.2 },

  // Card compacta de "Semana pasada" — muestra solo la última entrada + contador
  ultimaCard:   { backgroundColor: '#f5f4ed', borderRadius: 20, padding: 22, gap: 12 },
  contadorRestante: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#3d6841', marginTop: 4 },

  capsulaCard:  { backgroundColor: '#eee1cc', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  capsulaTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: '#595141', letterSpacing: -0.3 },
  capsulaSub:   { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#635a4a', lineHeight: 18 },
  capsulaTag:   { alignSelf: 'flex-start', backgroundColor: '#f8f0e3', borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10, marginTop: 6 },
  capsulaTagText:{ fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#5f5950', letterSpacing: 1.2 },
  capsulaLock:  { width: 48, height: 48, borderRadius: 24, backgroundColor: '#675e4d', alignItems: 'center', justifyContent: 'center' },
});
