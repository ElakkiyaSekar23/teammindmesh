export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(200).json({ ok: true, location: { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 } });
    return;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'DeepTier/1.0' }, signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const data: any = await resp.json();
      const addr = data.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.state_district || addr.suburb || 'Chennai';
      const state = addr.state || 'Tamil Nadu';
      res.status(200).json({ ok: true, location: { city, state, lat, lng } });
      return;
    }
  } catch {}
  res.status(200).json({ ok: true, location: { city: 'Chennai', state: 'Tamil Nadu', lat, lng } });
}
