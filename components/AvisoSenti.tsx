/**
 * Aviso flotante con el diseño de Senti.
 *
 * Reemplaza los Alert.alert nativos (grises del sistema) por un modal
 * coherente con el resto de la app: card blanco flotante, overlay suave,
 * tipografías y botón pill verde. Mismo lenguaje visual que LogroModal.
 *
 * Uso:
 *   const [aviso, setAviso] = useState<AvisoConfig | null>(null);
 *   ...
 *   setAviso({ titulo: 'Carta demasiado larga', mensaje: 'Máximo 2000 caracteres.' });
 *   ...
 *   <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
 *
 * Con dos botones (confirmación / upsell):
 *   setAviso({
 *     titulo: 'Ya tienes una cápsula sellada',
 *     mensaje: 'El plan gratuito incluye 1 cápsula activa…',
 *     icono: 'lock-closed', iconoBg: '#eee1cc', iconoColor: '#595141',
 *     botones: [
 *       { texto: 'Conocer Senti+', variante: 'primario', onPress: () => router.push('/upgrade') },
 *       { texto: 'Ahora no', variante: 'secundario' },
 *     ],
 *   });
 */

import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type AvisoBoton = {
  texto: string;
  onPress?: () => void;
  variante?: 'primario' | 'secundario';
};

export type AvisoConfig = {
  titulo: string;
  mensaje?: string;
  icono?: keyof typeof Ionicons.glyphMap;
  iconoColor?: string;
  iconoBg?: string;
  botones?: AvisoBoton[];
};

type Props = {
  aviso: AvisoConfig | null;
  onClose: () => void;
};

export default function AvisoSenti({ aviso, onClose }: Props) {
  if (!aviso) return null;

  const icono     = aviso.icono ?? 'information-circle-outline';
  const iconoBg   = aviso.iconoBg ?? '#f8f0e3';
  const iconoColor = aviso.iconoColor ?? '#8a5010';
  const botones   = aviso.botones ?? [{ texto: 'Entendido', variante: 'primario' as const }];

  function press(b: AvisoBoton) {
    b.onPress?.();
    onClose();
  }

  return (
    <Modal visible={!!aviso} transparent animationType="fade" statusBarTranslucent>
      <View style={S.overlay}>
        <View style={S.card}>

          <View style={[S.iconoWrap, { backgroundColor: iconoBg }]}>
            <Ionicons name={icono} size={20} color={iconoColor} />
          </View>

          <Text style={S.titulo}>{aviso.titulo}</Text>

          {aviso.mensaje ? <Text style={S.mensaje}>{aviso.mensaje}</Text> : null}

          <View style={S.botones}>
            {botones.map((b, i) => {
              const secundario = b.variante === 'secundario';
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => press(b)}
                  activeOpacity={secundario ? 0.6 : 0.85}
                  style={secundario ? S.btnSecundario : S.btnPrimario}
                >
                  <Text style={secundario ? S.btnSecundarioText : S.btnPrimarioText}>{b.texto}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
    paddingHorizontal: 44,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: 'rgba(103, 94, 77, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 18,
  },
  iconoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: '#31332c',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 23,
    marginBottom: 8,
  },
  mensaje: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#5e6058',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  botones: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  btnPrimario: {
    backgroundColor: '#3d6841',
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 34,
  },
  btnPrimarioText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#e4ffe0',
    letterSpacing: 0.3,
  },
  btnSecundario: {
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  btnSecundarioText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#797c73',
  },
});
