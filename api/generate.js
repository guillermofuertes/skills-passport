export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { mode, name, experience, sector, lang = 'Español', baseProfile, offer } = req.body;

  let prompt;

  if (mode === 'adapt') {
    // ADAPTATION MODE
    if (!baseProfile || !offer) return res.status(400).json({ error: 'Faltan datos para la adaptación' });

    const bp = baseProfile;
    prompt = `Adapta este perfil profesional a la oferta de trabajo indicada. Responde SOLO con JSON puro, sin texto antes ni después, sin backticks.

PERFIL BASE:
Titular: ${bp.title || ''}
Resumen: ${bp.summary || ''}
Capacidades: ${(bp.capabilities || []).join(' | ')}
Habilidades: ${(bp.keywords || []).join(', ')}

OFERTA DE TRABAJO:
${offer.slice(0, 2000)}

Genera el perfil adaptado con esta estructura JSON exacta:
{
  "title": "titular ajustado al puesto concreto de la oferta",
  "summary": "perfil en primera persona enfatizando lo más relevante para esta oferta",
  "capabilities": ["capacidad relevante 1", "capacidad relevante 2", "capacidad relevante 3", "capacidad relevante 4"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "translations": [
    {"raw": "expresión del candidato", "modern": "término que usa la oferta"},
    {"raw": "expresión 2", "modern": "término 2"},
    {"raw": "expresión 3", "modern": "término 3"},
    {"raw": "expresión 4", "modern": "término 4"},
    {"raw": "expresión 5", "modern": "término 5"},
    {"raw": "expresión 6", "modern": "término 6"}
  ],
  "growth": ["gap detectado y cómo cubrirlo 1", "gap 2", "sugerencia 3"]
}

Idioma de respuesta: ${lang}`;

  } else {
    // GENERATION MODE
    if (!name || !experience) return res.status(400).json({ error: 'Nombre y trayectoria son obligatorios' });

    prompt = `Eres un experto en traducir trayectorias profesionales al lenguaje del mercado laboral actual.

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
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    if (!r.ok) throw new Error(data?.error?.message || `Error API ${r.status}`);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Respuesta inesperada de la IA', debug: raw.slice(0, 200) });

    const parsed = JSON.parse(match[0]);
    res.json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
