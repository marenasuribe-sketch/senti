import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // 1. Verificar sesión
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Sesión inválida' }, 401);

    // 2. Verificar rate limit de audios (server-side)
    const perfil = await supabase.from('perfiles').select('es_premium').eq('user_id', user.id).maybeSingle();
    const esPremium = perfil.data?.es_premium ?? false;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const { count: audiosHoy } = await supabase.from('journal')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('via_audio', true)
      .gte('created_at', hoy.toISOString());

    const limite = esPremium ? 10 : 1;
    if ((audiosHoy ?? 0) >= limite) {
      return json({ error: esPremium ? 'LIMITE_AUDIO_PREMIUM' : 'LIMITE_AUDIO_GRATIS' }, 429);
    }

    // 3. Recibir el audio como multipart/form-data
    const contentLength = parseInt(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_AUDIO_BYTES) return json({ error: 'Audio demasiado grande (máx. 10 MB)' }, 413);

    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    if (!audioFile) return json({ error: 'No se recibió archivo de audio' }, 400);

    // 4. Reenviar a OpenAI Whisper (key vive solo en el servidor)
    const whisperForm = new FormData();
    whisperForm.append('file', audioFile);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'es');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')!}` },
      body: whisperForm,
    });

    if (!res.ok) {
      console.error('OpenAI error:', res.status, await res.text());
      return json({ error: 'Error al transcribir el audio' }, 502);
    }

    const data = await res.json();
    return json({ texto: data.text }, 200);

  } catch (e) {
    console.error('Edge Function error:', e);
    return json({ error: 'Error interno' }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
