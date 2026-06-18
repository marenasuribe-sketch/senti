/**
 * Llamadas a Edge Functions que envían archivos (multipart/form-data).
 *
 * Usamos fetch directo en vez de supabase.functions.invoke porque el SDK
 * de supabase-js NO maneja bien multipart/form-data en React Native: rompe
 * el boundary del FormData y la función recibe el archivo vacío, devolviendo
 * "Edge Function returned a non-2xx status code". Con fetch directo, React
 * Native arma el multipart correctamente y además podemos leer el cuerpo de
 * error real que devuelve la función (códigos como LIMITE_AUDIO_GRATIS).
 */

const SUPABASE_URL = 'https://mumtrkgnfvfstdjtyiui.supabase.co';

const MIME: Record<string, string> = {
  m4a: 'audio/m4a', mp4: 'audio/mp4', wav: 'audio/wav',
  caf: 'audio/x-caf', '3gp': 'audio/3gpp',
};

/**
 * Sube un audio a la Edge Function de transcripción y devuelve el texto.
 * Lanza Error con el código de la función (LIMITE_AUDIO_GRATIS, etc.) o un
 * mensaje legible si algo falla.
 */
export async function transcribirAudio(uri: string, accessToken: string): Promise<string> {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const form = new FormData();
  form.append('file', { uri, name: `audio.${ext}`, type: MIME[ext] ?? 'audio/m4a' } as any);

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/transcribir-audio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } catch {
    throw new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  }

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    // La Edge Function pone el código en data.error (LIMITE_AUDIO_GRATIS, etc.)
    throw new Error(data?.error ?? `Error ${res.status} al transcribir`);
  }
  return (data?.texto ?? '') as string;
}
