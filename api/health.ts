export default function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  res.status(200).json({
    ok: true,
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    groqConfigured: Boolean(
      process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY',
    ),
  });
}
