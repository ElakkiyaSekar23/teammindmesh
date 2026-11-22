/**
 * /api/groq/explain
 * Uses Groq LLM to explain a supply chain risk event in plain language
 * for a small business owner, in their local language.
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
  if (!apiKey || apiKey.length < 10 || apiKey === 'MY_GROQ_API_KEY') {
    res.status(200).json({ ok: false, error: 'Groq not configured' });
    return;
  }

  const { eventTitle, eventType, region, severity, shopName, shopCategory, uiLanguage } = req.body ?? {};

  const langName = uiLanguage === 'ta' ? 'Tamil' : uiLanguage === 'hi' ? 'Hindi' : uiLanguage === 'te' ? 'Telugu' : 'English';

  try {
    const prompt = `You are a friendly supply chain advisor for small Indian businesses. Explain this risk event to a shop owner in simple, practical ${langName}.

Event: ${eventTitle || eventType}
Type: ${eventType}
Region: ${region}
Severity: ${Math.round((severity ?? 0.5) * 100)}%
Business: ${shopName} (${shopCategory})

Provide:
1. What happened (1 sentence)
2. How it affects this business specifically (1-2 sentences)
3. What the owner should do right now (2-3 bullet points)

Keep it simple, practical, and under 150 words total. Use ${langName}.`;

    const resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      res.status(200).json({ ok: false, error: `Groq error ${resp.status}` });
      return;
    }

    const data: any = await resp.json();
    const explanation = data?.choices?.[0]?.message?.content ?? '';
    res.status(200).json({ ok: true, explanation: explanation.trim() });
  } catch (err: any) {
    res.status(200).json({ ok: false, error: err?.message ?? 'Unknown error' });
  }
}
