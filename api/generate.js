export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, experience, sector, lang = 'Español' } = req.body;
  if (!name || !experience) return res.status(400).json({ error: 'Nombre y trayectoria son obligatorios' });

  const prompt = `Eres un experto en traducir trayectorias profesionales al lenguaje del mercado laboral actual.

IMPORTANTE: Responde SOLO con JSON. Nada más. Ni una palabra antes ni después del JSON.

{
  "title": "titular profesional una línea",
  "summary": "perfil 3-4 frases primera persona",
  "capabilities": ["capacidad 1", "capacidad 2", "capacidad 3", "capacidad 4"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8", "kw9", "kw10"],
  "translations": [
    {"raw": "expresión candidato", "modern": "término mercado"},
    {"raw": "expresión 2", "modern": "término 2"},
    {"raw": "expresión 3", "modern": "término 3"},
    {"raw": "expresión 4", "modern": "término 4"},
    {"raw": "expresión 5", "modern": "término 5"},
    {"raw": "expresión 6", "modern": "término 6"}
  ],
  "growth": ["sugerencia 1", "sugerencia 2", "sugerencia 3"]
}

Idioma: ${lang}${sector ? `\nSector: ${sector}` : ''}
Nombre: ${name}
Trayectoria: ${experience}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data?.error?.message || `Error API ${r.status}`);
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to extract JSON object from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      // Return raw for debugging
      return res.status(500).json({
        error: 'Respuesta inesperada de Gemini',
        debug: raw.slice(0, 300)
      });
    }

    const parsed = JSON.parse(match[0]);
    res.json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
