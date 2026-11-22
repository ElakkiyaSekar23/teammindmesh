/**
 * /api/groq/read-news
 * Analyzes a user-submitted news text using Groq LLM to extract
 * supply chain risk events. Returns structured JSON for the frontend.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const uiLanguage = req.body?.uiLanguage === 'ta' ? 'Tamil' : req.body?.uiLanguage === 'hi' ? 'Hindi' : 'English';
  const knownCities: string[] = Array.isArray(req.body?.knownCities) ? req.body.knownCities.slice(0, 30) : [];
  const knownGroups: string[] = Array.isArray(req.body?.knownGroups) ? req.body.knownGroups.slice(0, 15) : [];

  if (!apiKey || apiKey.length < 10 || apiKey === 'MY_GROQ_API_KEY' || !text) {
    res.status(200).json({ ok: false, fallback: true, error: 'Groq not configured or empty input' });
    return;
  }

  try {
    const citiesHint = knownCities.length > 0 ? `Known supply cities: ${knownCities.join(', ')}.` : '';
    const groupsHint = knownGroups.length > 0 ? `Known supply groups: ${knownGroups.join(', ')}.` : '';

    const prompt = `You are a supply chain risk analyst for Indian small businesses (tea stalls, kirana stores, restaurants, bakeries).

Analyze this news/message and extract supply chain risks:
"""${text}"""

${citiesHint}
${groupsHint}

Return ONLY valid JSON:
{
  "language": "ta|hi|en|te|kn|ml|bn|mr",
  "translation": "English translation or summary of the text",
  "sourceKind": "news|govt alert|forward",
  "events": [
    {
      "type": "flood|cyclone|heatwave|water_shortage|power_outage|transport_strike|port_congestion|highway_blockade|factory_fire|crop_disease|cattle_disease|raw_material_shortage|export_ban|gas_shortage|material_price_spike|fuel_price_hike|supplier_shutdown|cyber_attack",
      "target": "affected city, region, or commodity group name",
      "severity": 0.1-1.0,
      "pricePct": null or 0.05-0.5 for price events,
      "durationDays": 1-30,
      "confidence": 0.1-1.0,
      "evidence": "key phrase from text that supports this event"
    }
  ]
}

Rules:
- If text has no supply chain relevance, return empty events array
- severity: 0.3=minor, 0.6=moderate, 0.9=severe
- confidence: 0.9=clear evidence, 0.6=implied, 0.3=speculation
- pricePct: fraction like 0.15 means 15% price increase`;

    const resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      res.status(200).json({ ok: false, fallback: true, error: `Groq API error ${resp.status}: ${errText.slice(0, 100)}` });
      return;
    }

    const data: any = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      res.status(200).json({ ok: false, fallback: true, error: 'Empty response from Groq' });
      return;
    }

    const parsed = JSON.parse(content);
    res.status(200).json({ ok: true, result: parsed, readerMode: 'groq' });
  } catch (err: any) {
    res.status(200).json({ ok: false, fallback: true, error: err?.message ?? 'Unknown error' });
  }
}
