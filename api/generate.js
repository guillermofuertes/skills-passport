export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, experience, sector, lang = 'Español' } = req.body;
  if (!name || !experience) return res.status(400).json({ error: 'Nombre y trayectoria son obligatorios' });

  const prompt = `Eres un experto en traducir trayectorias profesionales al lenguaje del mercado laboral actual, especialmente para personas con carreras no lineales o mayores de 50 años.

Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después. Sin backticks. Sin markdown. Solo el JSON puro.

Estructura exacta:
{
  "title": "titular profesional de una línea, estilo LinkedIn",
  "summary": "perfil en primera persona, 3-4 frases, concreto, sin clichés",
  "capabilities": ["capacidad 1", "capacidad 2", "capacidad 3", "capacidad 4"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "translations": [
    {"raw": "expresión del candidato", "modern": "término de mercado actual"},
    {"raw": "expresión 2", "modern": "término 2"},
    {"raw": "expresión 3", "modern": "término 3"},
    {"raw": "expresión 4", "modern": "término 4"},
    {"raw": "expresión 5", "modern": "término 5"},
    {"raw": "expresión 6", "modern": "término 6"}
  ],
  "growth": ["sugerencia concreta 1 con recurso gratuito", "sugerencia 2", "sugerencia 3"]
}

Idioma de respuesta: ${lang}${sector ? `\nSector de interés: ${sector}` : ''}

Trayectoria de ${name}:
${experience}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Error API ${r.status}`);
    }

    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Robust JSON extraction: find the outermost { ... }
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No se encontró JSON válido en la respuesta');
    const parsed = JSON.parse(match[0]);
    res.json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
