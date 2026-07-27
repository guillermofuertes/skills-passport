export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, experience, sector, lang = 'Español' } = req.body;
  if (!name || !experience) return res.status(400).json({ error: 'Nombre y trayectoria son obligatorios' });

  const system = `Eres un experto en traducir trayectorias profesionales al lenguaje del mercado laboral actual, especialmente para personas con carreras no lineales o mayores de 50 años.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin backticks. Estructura exacta:
{
  "title": "titular profesional de una línea, estilo LinkedIn, que refleje su valor real en el mercado actual",
  "summary": "perfil en primera persona, 3-4 frases, concreto, sin clichés. Que suene a una persona real.",
  "capabilities": ["capacidad concreta 1", "capacidad concreta 2", "capacidad concreta 3", "capacidad concreta 4"],
  "keywords": ["mínimo 10 palabras clave para LinkedIn y portales de empleo"],
  "translations": [
    {"raw": "como lo dice el candidato", "modern": "término actual de mercado"}
  ],
  "growth": ["sugerencia muy concreta 1 con recurso gratuito si aplica", "sugerencia 2", "sugerencia 3"]
}

Idioma: ${lang}${sector ? `\nSector de interés: ${sector}` : ''}
Sé honesto y específico. Sin jerga vacía. Mínimo 6 filas en translations.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: `Trayectoria de ${name}:\n\n${experience}` }]
      })
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Error API ${r.status}`);
    }

    const data = await r.json();
    const raw = data.content.map(b => b.text || '').join('');
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
