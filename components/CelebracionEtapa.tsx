/**
 * Modal de celebración que aparece cuando la planta sube de etapa
 * tras una acción del usuario (Diario, Gratitud, Descarga).
 *
 * Se dispara desde cada pantalla pasando { etapa, plantaId } cuando
 * sumarGotas() devuelve subio=true.
 */

import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { emojiEtapa, labelEtapa, PLANTAS_INFO, MAX_ETAPAS } from '../lib/planta';

type Props = {
  visible: boolean;
  etapa: number;
  plantaId: string | null;
  onClose: () => void;
};

export default function CelebracionEtapa({ visible, etapa, plantaId, onClose }: Props) {
  const emoji = emojiEtapa(etapa, plantaId);
  const label = labelEtapa(etapa);
  const glow  = plantaId ? PLANTAS_INFO[plantaId]?.glow ?? '#bfefbd' : '#bfefbd';

  const titulo = etapa === MAX_ETAPAS
    ? 'Llegó a su plenitud.'
    : 'Tu planta creció.';

  const sub = etapa === MAX_ETAPAS
    ? 'Tu constancia la llevó hasta aquí. Esto es lo que el cuidado real construye.'
    : `Pasaste a ${label.toLowerCase()}. Cada gota contó.`;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <View style={S.bg}>
        <View style={[S.glow, { backgroundColor: glow }]} />
        <View style={S.inner}>
          <Text style={S.emoji}>{emoji}</Text>
          <Text style={S.label}>{label}</Text>
          <Text style={S.titulo}>{titulo}</Text>
          <Text style={S.sub}>{sub}</Text>

          <TouchableOpacity style={S.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={S.btnText}>Seguir cuidándome</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center', padding: 32 },
  glow:   { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.5, top: '20%' },
  inner:  { alignItems: 'center', gap: 12, width: '100%' },
  emoji:  { fontSize: 110, marginBottom: 8 },
  label:  { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#3d6841', letterSpacing: 2 },
  titulo: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, color: '#31332c', textAlign: 'center', lineHeight: 40, letterSpacing: -0.8, marginTop: 4 },
  sub:    { fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#5e6058', textAlign: 'center', marginTop: 6, lineHeight: 22, paddingHorizontal: 16 },
  btn:    { backgroundColor: '#3d6841', borderRadius: 9999, paddingVertical: 16, paddingHorizontal: 36, marginTop: 40 },
  btnText:{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#e4ffe0' },
});
