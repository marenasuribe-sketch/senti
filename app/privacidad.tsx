import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const FECHA_ACTUALIZACION = '10 de junio de 2026';

export default function PrivacidadScreen() {
  const router = useRouter();

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#5e6058" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Privacidad y Términos</Text>
      </View>

      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.updated}>Última actualización: {FECHA_ACTUALIZACION}</Text>

        {/* ── PRIVACIDAD ── */}
        <Text style={S.sectionTitle}>Política de Privacidad</Text>

        <Bloque titulo="Qué datos guardamos">
          Senti guarda únicamente lo que tú escribes o grabas: entradas de diario, gratitudes, descargas emocionales y cartas a tu yo futuro. También guardamos tu email de Google para identificar tu cuenta.
        </Bloque>

        <Bloque titulo="Para qué usamos tus datos">
          Tus datos se usan exclusivamente para mostrarte tu historial, analizar tus emociones con IA y hacer crecer tu planta. Nunca los usamos para publicidad, ni los vendemos a terceros.
        </Bloque>

        <Bloque titulo="Análisis con inteligencia artificial">
          Cuando usas el Diario, tu texto se envía a la API de Anthropic (Claude) para generar el análisis emocional. Anthropic no almacena tus mensajes por defecto. El análisis se guarda en nuestra base de datos asociado únicamente a tu cuenta.
        </Bloque>

        <Bloque titulo="Transcripción de audio">
          Si usas la función de audio, la grabación se envía a la API de OpenAI (Whisper) para transcribirla. OpenAI no retiene el audio una vez transcrito. Solo guardamos el texto resultante.
        </Bloque>

        <Bloque titulo="Dónde se almacenan tus datos">
          Tu información se almacena en Supabase (base de datos PostgreSQL en la nube). Los servidores están ubicados en la región US East. Tus datos están protegidos con autenticación y Row Level Security: ningún otro usuario puede leer tus entradas.
        </Bloque>

        <Bloque titulo="Acceso a tus datos">
          Solo tú puedes ver tus entradas. El equipo de Senti no accede a tu contenido personal salvo en caso de requerimiento legal o para resolver un problema técnico que tú reportes.
        </Bloque>

        <Bloque titulo="Cuánto tiempo guardamos tus datos">
          Tus datos se conservan mientras tengas una cuenta activa. Si eliminas tu cuenta, todos tus datos son borrados permanentemente dentro de 30 días.
        </Bloque>

        <Bloque titulo="Tus derechos">
          Tienes derecho a acceder, corregir o eliminar tu información en cualquier momento. Para ejercerlos escríbenos a privacidad@senti.app.
        </Bloque>

        {/* ── TÉRMINOS ── */}
        <Text style={[S.sectionTitle, { marginTop: 32 }]}>Términos de Uso</Text>

        <Bloque titulo="Uso permitido">
          Senti es una herramienta de bienestar personal. Puedes usarla para tu propio cuidado emocional. No está permitido usar la app para fines ilegales, compartir acceso con terceros ni intentar acceder a datos de otros usuarios.
        </Bloque>

        <Bloque titulo="No es atención médica">
          Senti no es un servicio de salud mental ni reemplaza la atención profesional. Si estás en crisis, comunícate con un profesional de salud mental o una línea de emergencia en tu país.
        </Bloque>

        <Bloque titulo="Propiedad intelectual">
          El contenido de la app (diseño, textos, lógica) pertenece a Senti. Tus entradas personales son tuyas — Senti no reclama propiedad sobre lo que escribes.
        </Bloque>

        <Bloque titulo="Cambios en el servicio">
          Podemos actualizar estas políticas o el servicio con aviso previo por email. El uso continuado de la app después del aviso implica aceptación de los cambios.
        </Bloque>

        <Bloque titulo="Contacto">
          ¿Preguntas? Escríbenos a hola@senti.app
        </Bloque>

        <View style={S.footer} />
      </ScrollView>
    </View>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: string }) {
  return (
    <View style={S.bloque}>
      <Text style={S.bloqueTitle}>{titulo}</Text>
      <Text style={S.bloqueBody}>{children}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fbf9f4' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24, backgroundColor: '#fbf9f4' },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#31332c', letterSpacing: -0.3 },

  content:     { paddingHorizontal: 24, paddingBottom: 48 },
  updated:     { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#b1b3a9', marginBottom: 24 },

  sectionTitle:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: '#31332c', letterSpacing: -0.6, marginBottom: 16 },

  bloque:      { marginBottom: 20, backgroundColor: '#f5f4ed', borderRadius: 16, padding: 18, gap: 6 },
  bloqueTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#31332c' },
  bloqueBody:  { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', lineHeight: 22 },

  footer:      { height: 24 },
});
