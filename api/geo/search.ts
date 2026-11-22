export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.status(200).json({ ok: true, results: [] });
    return;
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q,
    )}&count=6&language=en&format=json`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!resp.ok) {
      res.status(200).json({ ok: true, results: [] });
      return;
    }
    const data: any = await resp.json();
    const items = (data.results ?? [])
      .filter((r: any) => r.name && typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map((r: any) => ({
        city: r.name,
        state: r.admin1 || r.country || 'India',
        lat: r.latitude,
        lng: r.longitude,
      }));
    res.status(200).json({ ok: true, results: items });
  } catch {
    res.status(200).json({ ok: true, results: [] });
  }
}
