// Límites de caracteres por tipo de contenido
export const LIMITES_TEXTO = {
  gratitud: 500,
  journal: 3000,
  descarga: 3000,
  capsula: 2000,
} as const;

export type CampoTexto = keyof typeof LIMITES_TEXTO;

// Valida un texto y devuelve el error en español, o null si está ok
export function validarTexto(
  texto: string,
  campo: CampoTexto,
  opciones?: { requerido?: boolean; minimo?: number },
): string | null {
  const { requerido = false, minimo = 0 } = opciones ?? {};
  const limpio = texto.trim();

  if (requerido && limpio.length === 0) return 'Este campo es requerido.';
  if (limpio.length > 0 && limpio.length < minimo) return `Escribe al menos ${minimo} caracteres.`;
  if (limpio.length > LIMITES_TEXTO[campo]) return `Máximo ${LIMITES_TEXTO[campo]} caracteres.`;

  return null;
}

// Devuelve cuántos caracteres quedan (negativo = pasado el límite)
export function caracteresRestantes(texto: string, campo: CampoTexto): number {
  return LIMITES_TEXTO[campo] - texto.trim().length;
}

// True si el texto supera el límite
export function superaLimite(texto: string, campo: CampoTexto): boolean {
  return texto.trim().length > LIMITES_TEXTO[campo];
}
