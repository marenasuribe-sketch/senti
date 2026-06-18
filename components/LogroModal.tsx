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
            <Ionicons name={logro.icono as any} size={28} color="#1e4824" />
          </View>

          {/* Categoría — label pequeño */}
          <Text style={S.categoria}>{labelCategoria(logro.categoria)}</Text>

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

function labelCategoria(cat: Logro['categoria']): string {
  const labels: Record<Logro['categoria'], string> = {
    inicio:     'PRIMER PASO',
    sentir:     'PERMITIRTE SENTIR',
    constancia: 'CONSTANCIA AMABLE',
    soltar:     'SOLTAR Y AGRADECER',
    voz:        'TU VOZ',
    planta:     'TU PLANTA',
  };
  return labels[cat];
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 33, 27, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#bfefbd',
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    gap: 0,
    shadowColor: 'rgba(30, 72, 36, 1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  iconoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(61, 104, 65, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoria: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#3d6841',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  nombre: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: '#1e4824',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 16,
  },
  mensaje: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: '#2d5430',
    textAlign: 'center',
    lineHeight: 25,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: '#3d6841',
    borderRadius: 9999,
    paddingVertical: 15,
    paddingHorizontal: 48,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#e4ffe0',
    letterSpacing: 0.3,
  },
});
