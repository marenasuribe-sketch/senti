import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Logro } from '../lib/logros';

type Props = {
  logro: Logro | null;
  onClose: () => void;
};

export default function LogroModal({ logro, onClose }: Props) {
  if (!logro) return null;

  return (
    <Modal visible={!!logro} transparent animationType="fade" statusBarTranslucent>
      <View style={S.overlay}>
        <View style={S.card}>
          <View style={S.iconoWrap}>
            <Ionicons name={logro.icono as any} size={16} color="#1e4824" />
          </View>
          <Text style={S.mensaje}>"{logro.mensaje}"</Text>
          <TouchableOpacity style={S.btn} onPress={onClose} activeOpacity={0.8}>
            <Text style={S.btnText}>Seguir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#bfefbd',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(20, 50, 24, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(61, 104, 65, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mensaje: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#2d5430',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  btn: {
    backgroundColor: '#3d6841',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#e4ffe0',
  },
});
