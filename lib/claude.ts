// Cliente de Claude para análisis de bienestar mental
// La API key se pasa en cada llamada para no exponerla en build

const ANTHROPIC_API_KEY = 'TU_ANTHROPIC_API_KEY'; // Reemplaza con tu key

export async function analizarJournal(texto: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Eres un acompañante de bienestar mental empático. Analiza este pensamiento y responde con 2-3 oraciones breves: una observación sobre la emoción principal, y un mensaje de apoyo gentil. No des consejos médicos. Sé cálido y humano.

Pensamiento: "${texto}"`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Error al conectar con Claude');
  }

  const data = await response.json();
  return data.content[0].text;
}
