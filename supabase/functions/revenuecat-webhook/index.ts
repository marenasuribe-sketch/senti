import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Eventos que activan Senti+
const ACTIVAR = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'TRANSFER',
]);

// Eventos que desactivan Senti+
const DESACTIVAR = new Set([
  'EXPIRATION',
  'CANCELLATION',
  'BILLING_ISSUE',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200, CORS);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Validar el webhook secret de RevenueCat (configúralo en RevenueCat dashboard)
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    if (webhookSecret) {
      const authHeader = req.headers.get('Authorization') ?? '';
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    const body = await req.json();
    const evento = body?.event;
    if (!evento?.type || !evento?.app_user_id) {
      return json({ error: 'Payload inválido' }, 400);
    }

    const tipo = evento.type as string;
    const userId = evento.app_user_id as string; // = Supabase auth user_id

    // Usar service_role para poder escribir en perfiles sin importar RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (ACTIVAR.has(tipo)) {
      const premiumHasta = evento.expiration_at_ms
        ? new Date(Number(evento.expiration_at_ms)).toISOString()
        : null;

      await supabase.from('perfiles').upsert(
        {
          user_id: userId,
          es_premium: true,
          premium_desde: new Date().toISOString(),
          premium_hasta: premiumHasta,
        },
        { onConflict: 'user_id' },
      );

      console.log(`Senti+ activado: ${userId} hasta ${premiumHasta ?? 'sin fecha'}`);

    } else if (DESACTIVAR.has(tipo)) {
      await supabase
        .from('perfiles')
        .update({ es_premium: false })
        .eq('user_id', userId);

      console.log(`Senti+ desactivado: ${userId} (${tipo})`);
    }
    // Otros tipos (TEST, etc.) se ignoran silenciosamente

    return json({ ok: true }, 200);

  } catch (e) {
    console.error('Webhook RevenueCat error:', e);
    return json({ error: 'Error interno' }, 500);
  }
});

function json(data: unknown, status: number, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, ...extraHeaders, 'Content-Type': 'application/json' },
  });
}
