import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TEXTO_CHARS = 3000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // 1. Verificar sesión del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Sesión inválida' }, 401);

    // 2. Leer y validar el body
    const body = await req.json();
    const texto: string = body?.texto ?? '';

    if (!texto || texto.trim().length < 10) return json({ error: 'Texto demasiado corto' }, 400);
    if (texto.length > MAX_TEXTO_CHARS) return json({ error: 'Texto demasiado largo' }, 400);

    // 3. Verificar plan y rate limit
    const perfil = await supabase.from('perfiles').select('es_premium').eq('user_id', user.id).maybeSingle();
    const esPremium = perfil.data?.es_premium ?? false;

    if (esPremium) {
      // Premium: 4 análisis por día
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      const { count } = await supabase.from('journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('es_descarga', false)
        .gte('created_at', inicioDia.toISOString());
      if ((count ?? 0) >= 4) return json({ error: 'LIMITE_DIA' }, 429);
    } else {
      // Gratis: 1 análisis por mes
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const { count } = await supabase.from('journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('es_descarga', false)
        .gte('created_at', inicioMes.toISOString());
      if ((count ?? 0) >= 1) return json({ error: 'LIMITE_MES' }, 429);
    }

    // 4. Recuperar contexto histórico según plan
    // Premium: últimos 60 días (~2 meses de patrones)
    // Gratis: últimos 7 días
    const diasContexto = esPremium ? 60 : 7;
    const inicioContexto = new Date();
    inicioContexto.setDate(inicioContexto.getDate() - diasContexto);
    inicioContexto.setHours(0, 0, 0, 0);

    const { data: entradasPrevias } = await supabase
      .from('journal')
      .select('texto, created_at, estres, calma, energia')
      .eq('user_id', user.id)
      .eq('es_descarga', false)
      .gte('created_at', inicioContexto.toISOString())
      .order('created_at', { ascending: false })
      .limit(esPremium ? 20 : 5);

    const contextoHistorico = (entradasPrevias ?? [])
      .map(e => {
        const fecha = new Date(e.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return `[${fecha}] ${e.texto.substring(0, 200)}`;
      })
      .join('\n\n');

    const sistemaBase = `Eres un asistente empático de bienestar emocional con memoria. Analiza el texto del diario de hoy y responde SOLO con JSON válido, sin texto extra.
Formato exacto:
{
  "reflexion": "reflexión principal en 1-2 frases, segunda persona",
  "acciones": ["tema1", "tema2", "tema3"],
  "accionTipos": ["warm|mist|sage", "warm|mist|sage", "warm|mist|sage"],
  "emociones": [
    {"label": "Estrés", "valor": 0-100, "color": "#C4886A"},
    {"label": "Calma", "valor": 0-100, "color": "#3d6841"},
    {"label": "Energía", "valor": 0-100, "color": "#C4A86A"}
  ],
  "observacion": "observación empática sobre un patrón detectado, entre comillas",
  "consejo": "consejo accionable y concreto en 2-3 frases, segunda persona"
}
Para accionTipos: warm=situación difícil/estrés, mist=estado mental/emocional, sage=algo positivo/logro.`;

    const sistemaConMemoria = contextoHistorico
      ? `${sistemaBase}\n\nCONTEXTO HISTÓRICO (entradas previas de los últimos ${diasContexto} días):\n${contextoHistorico}\n\nUsa este contexto para detectar patrones recurrentes y personalizar el análisis. Si hay un tema que se repite, menciónalo en la observación.`
      : sistemaBase;

    // 5. Llamar a Anthropic
    const modeloPermitido = esPremium ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modeloPermitido,
        max_tokens: 1024,
        system: sistemaConMemoria,
        messages: [{ role: 'user', content: texto }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic error:', res.status, errText);
      return json({ error: 'Error al conectar con el análisis de IA' }, 502);
    }

    const data = await res.json();
    const raw = data.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Respuesta inválida de IA' }, 502);

    const analysis = JSON.parse(match[0]);
    return json({ analysis }, 200);

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
