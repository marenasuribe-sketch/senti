/**
 * Logo oficial de Senti — usa el ícono real de la app (assets/icon.png).
 * Idéntico al ícono que aparece en la pantalla principal del celular.
 *
 * Uso:
 *   <SentiLogo size={22} />
 *   <SentiLogo size={32} />
 */
import { Image } from 'react-native';

type Props = { size?: number };

export default function SentiLogo({ size = 24 }: Props) {
  return (
    <Image
      source={require('../assets/icon.png')}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22, // esquinas estilo iOS
      }}
      resizeMode="contain"
    />
  );
}
