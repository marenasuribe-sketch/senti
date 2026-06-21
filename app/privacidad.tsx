import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const FECHA_ACTUALIZACION = '19 de junio de 2026';

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

      <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        <Text style={S.updated}>Última actualización: {FECHA_ACTUALIZACION} · Ley 21.719 Chile</Text>

        {/* Aviso datos sensibles */}
        <View style={S.aviso}>
          <Text style={S.avisoText}>
            <Text style={S.avisoNegrita}>Sobre tus datos emocionales: </Text>
            Senti procesa información sobre tu bienestar psicológico. Bajo la Ley 21.719 de Chile, estos son datos sensibles y reciben protección especial. Solo se usan para entregarte el servicio — nunca con fines publicitarios.
          </Text>
        </View>

        {/* ── PRIVACIDAD ── */}
        <Text style={S.sectionTitle}>Política de Privacidad</Text>

        <Bloque titulo="1. Responsable del tratamiento">
          {'Macarena Arenas Uribe · Chile\nContacto: marenasuribe@gmail.com'}
        </Bloque>

        <Bloque titulo="2. Qué datos guardamos">
          {'• Datos de cuenta: correo y nombre (Google)\n• Diario, gratitudes y descargas emocionales (datos sensibles)\n• Análisis emocional con IA (estrés, calma, energía — datos sensibles)\n• Audio de voz: solo durante la transcripción, se elimina en menos de 60 segundos, nunca se almacena\n• Respuestas del onboarding (datos sensibles)\n• Progreso de tu planta, logros y racha\n• Cápsulas del tiempo (datos sensibles)\n• Plan de suscripción activo'}
        </Bloque>

        <Bloque titulo="3. Para qué usamos tus datos">
          {'Exclusivamente para entregarte el servicio que tú decides usar: guardar tu historial, mostrarte estadísticas de bienestar y hacer crecer tu planta.\n\nNunca los usamos para publicidad ni los vendemos a terceros.'}
        </Bloque>

        <Bloque titulo="4. Con quién compartimos tus datos">
          {'• Supabase (EE.UU.): almacenamiento de tu información con cifrado\n• Google (EE.UU.): inicio de sesión\n• Anthropic/Claude (EE.UU.): análisis emocional cuando presionas "Reflejar". No entrena sus modelos con tus datos.\n• OpenAI/Whisper (EE.UU.): transcripción de audio (no almacena el audio)\n• RevenueCat (EE.UU.): gestión de suscripciones (solo recibe un ID anónimo)\n\nTodos los proveedores cumplen estándares equivalentes de protección, conforme al Art. 27 de la Ley 21.719.'}
        </Bloque>

        <Bloque titulo="5. Seguridad de tus datos">
          {'• Cifrado HTTPS/TLS en todas las comunicaciones\n• Aislamiento total: ninguna usuaria puede ver datos de otra\n• Claves de IA solo en el servidor, nunca en el dispositivo\n• El estado Senti+ solo puede activarse desde el servidor\n• Audio: se elimina en menos de 60 segundos tras transcribir\n• Notificación de brechas en máximo 30 días (Art. 49 Ley 21.719)'}
        </Bloque>

        <Bloque titulo="6. Cuánto tiempo guardamos tus datos">
          {'• Diario, gratitudes, cápsulas: mientras tu cuenta esté activa + 30 días\n• Audio: menos de 60 segundos (eliminación inmediata)\n• Datos de cuenta: mientras activa + 90 días por seguridad\n• Registros técnicos de error: 30 días (automático)'}
        </Bloque>

        <Bloque titulo="7. Tus derechos ARCO+ (Ley 21.719)">
          {'Tienes derecho a:\n• Acceso: saber qué datos guardamos\n• Rectificación: corregir datos incorrectos\n• Supresión: eliminar todos tus datos\n• Oposición: rechazar ciertos tratamientos\n• Portabilidad: recibir tus datos en formato descargable\n• Revocación: retirar tu consentimiento en cualquier momento\n\nPara ejercer cualquier derecho: marenasuribe@gmail.com con el asunto "Derecho ARCO+ Senti". Respondemos en máximo 30 días hábiles.'}
        </Bloque>

        <Bloque titulo="8. Eliminar tu cuenta">
          {'Escríbenos a marenasuribe@gmail.com con el asunto "Eliminar mi cuenta Senti". Ejecutamos la eliminación completa en máximo 30 días y te confirmamos cuando esté lista.'}
        </Bloque>

        <Bloque titulo="9. Menores de edad">
          {'Senti está destinada a personas de 14 años o más, conforme al Art. 16 bis de la Ley 21.719. Menores de 14 años requieren consentimiento expreso de un adulto responsable.'}
        </Bloque>

        <Bloque titulo="10. Inteligencia Artificial">
          {'• El análisis emocional es orientativo — no es diagnóstico médico ni psicológico\n• Anthropic no entrena sus modelos con el contenido de tu diario\n• Ninguna decisión automática afecta tus derechos (Art. 30 Ley 21.719)\n• El análisis es opcional: solo ocurre cuando presionas "Reflejar"'}
        </Bloque>

        {/* ── TÉRMINOS ── */}
        <Text style={[S.sectionTitle, { marginTop: 32 }]}>Términos de Uso</Text>

        <Bloque titulo="Uso permitido">
          {'Senti es para tu propio cuidado emocional. No está permitido usarla para fines ilegales, compartir acceso con terceros ni intentar acceder a datos de otras usuarias.'}
        </Bloque>

        <Bloque titulo="No es atención médica">
          {'Senti no es un servicio de salud mental ni reemplaza la atención profesional. Si estás en crisis, comunícate con un profesional o una línea de emergencia.'}
        </Bloque>

        <Bloque titulo="Tus contenidos son tuyos">
          {'Lo que escribes en Senti te pertenece. No reclamamos propiedad intelectual sobre tus diarios, gratitudes ni descargas emocionales.'}
        </Bloque>

        <Bloque titulo="Cambios en el servicio">
          {'Avisamos con al menos 15 días de anticipación ante cambios materiales en esta política, mediante notificación dentro de la app.'}
        </Bloque>

        <Bloque titulo="Contacto">
          {'Preguntas o solicitudes: marenasuribe@gmail.com\nAsunto recomendado: "Privacidad Senti — [tu solicitud]"'}
        </Bloque>

        <View style={S.footer}>
          <Text style={S.footerText}>Política de Privacidad de Senti · {FECHA_ACTUALIZACION}</Text>
          <Text style={S.footerText}>Cumple con la Ley 21.719 de Protección de Datos Personales de Chile</Text>
        </View>
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
  updated:     { fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#b1b3a9', marginBottom: 18 },

  aviso:       { backgroundColor: '#fef3e2', borderLeftWidth: 3, borderLeftColor: '#8a5010', borderRadius: 10, padding: 16, marginBottom: 28 },
  avisoText:   { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5a3700', lineHeight: 20 },
  avisoNegrita:{ fontFamily: 'Manrope_600SemiBold', color: '#8a5010' },

  sectionTitle:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: '#31332c', letterSpacing: -0.6, marginBottom: 16 },

  bloque:      { marginBottom: 14, backgroundColor: '#f5f4ed', borderRadius: 16, padding: 18, gap: 6 },
  bloqueTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#31332c' },
  bloqueBody:  { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', lineHeight: 21 },

  footer:      { marginTop: 24, gap: 4, alignItems: 'center' },
  footerText:  { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#b1b3a9', textAlign: 'center' },
});
