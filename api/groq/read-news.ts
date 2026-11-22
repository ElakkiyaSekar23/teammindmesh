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

  if (!apiKey || apiKey === 'MY_GROQ_API_KEY' || !text) {
    res.status(200).json({ ok: false, fallback: true, error: 'Groq not configured or empty input' });
    return;
  }

  try {
    const prompt = `You are a supply chain risk assistant for Indian businesses. Input message:\n"""${text}"""\nReturn valid JSON: { "language": string, "translation": string, "sourceKind": "official" | "news" | "forward", "events": [{ "type": string, "target": string, "severity": number, "durationDays": number, "confidence": number }] }`;
    const resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      res.status(200).json({ ok: false, fallback: true });
      return;
    }
    const data: any = await resp.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    res.status(200).json({ ok: true, result: parsed, readerMode: 'groq' });
  } catch {
    res.status(200).json({ ok: false, fallback: true });
  }
}
