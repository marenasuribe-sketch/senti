/**
 * Modal de logro emocional.
 *
 * Aparece justo después de la acción que activó el logro.
 * Card verde claro (#BFEFBD), centrado, sin confeti, sin emojis decorativos.
 * Solo el ícono contextual, el nombre del logro, la frase en italic y un botón.
 */

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

          {/* Ícono contextual */}
          <View style={S.iconoWrap}>
            <Ionicons name={logro.icono as any} size={20} color="#1e4824" />
          </View>

          {/* Nombre del logro */}
          <Text style={S.nombre}>{logro.nombre}</Text>

          {/* Mensaje en italic */}
          <Text style={S.mensaje}>"{logro.mensaje}"</Text>

          {/* Botón único */}
          <TouchableOpacity style={S.btn} onPress={onClose} activeOpacity={0.85}>
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
    backgroundColor: 'rgba(30, 33, 27, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 52,
  },
  card: {
    backgroundColor: '#bfefbd',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    gap: 0,
    shadowColor: 'rgba(20, 50, 24, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 40,
    elevation: 18,
  },
  iconoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(61, 104, 65, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nombre: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: '#1e4824',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 9,
  },
  mensaje: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#2d5430',
    textAlign: 'center',
    lineHeight: 19,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  btn: {
    backgroundColor: '#3d6841',
    borderRadius: 9999,
    paddingVertical: 11,
    paddingHorizontal: 34,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#e4ffe0',
    letterSpacing: 0.3,
  },
});
