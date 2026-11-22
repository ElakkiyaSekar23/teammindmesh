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
  const summary = req.body?.summary;
  const uiLanguage = req.body?.uiLanguage === 'ta' ? 'Tamil' : req.body?.uiLanguage === 'hi' ? 'Hindi' : 'English';

  if (!apiKey || apiKey === 'MY_GROQ_API_KEY' || !summary) {
    res.status(200).json({ ok: false, fallback: true });
    return;
  }

  try {
    const resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Explain the calculated warning in 3 simple sentences. Return valid JSON only: { "sentences": ["...", "...", "..."] }',
          },
          {
            role: 'user',
            content: `Explain in ${uiLanguage}. Data: ${JSON.stringify(summary)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) {
      res.status(200).json({ ok: false, fallback: true });
      return;
    }
    const data: any = await resp.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    res.status(200).json({ ok: true, sentences: parsed.sentences || [] });
  } catch {
    res.status(200).json({ ok: false, fallback: true });
  }
}
