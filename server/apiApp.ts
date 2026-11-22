import 'dotenv/config';
import express from 'express';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getGroqApiKey(): string | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    return null;
  }
  return apiKey;
}

function extractJsonPayload(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse JSON from Groq response');
  }
}

async function callGroqJson(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 10000,
  temperature = 0.15,
): Promise<Record<string, unknown>> {
  const resp = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    let upstreamMsg = '';
    try {
      const parsedErr = JSON.parse(errText) as { error?: { message?: string } };
      upstreamMsg = parsedErr?.error?.message ?? '';
    } catch {
      // non-json error
    }
    if (resp.status === 429) {
      throw new Error('Groq API rate limit reached (429). Check your Groq quota.');
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Groq API key error. Verify GROQ_API_KEY in environment variables.');
    }
    throw new Error(upstreamMsg || `Groq API request failed (${resp.status}).`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!raw) {
    throw new Error('Empty Groq model output');
  }
  const parsed = extractJsonPayload(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Unexpected Groq JSON shape');
  }
  return parsed as Record<string, unknown>;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

async function resolveCityViaOpenMeteo(
  cityName: string,
): Promise<{ city: string; state: string; lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName,
    )}&count=5&language=en&format=json`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      results?: Array<{
        name?: string;
        admin1?: string;
        country_code?: string;
        latitude?: number;
        longitude?: number;
      }>;
    };
    const results = data.results ?? [];
    const indian = results.find((r) => r.country_code === 'IN') ?? results[0];
    if (
      !indian ||
      typeof indian.latitude !== 'number' ||
      typeof indian.longitude !== 'number'
    ) {
      return null;
    }
    return {
      city: indian.name || cityName,
      state: indian.admin1 || 'India',
      lat: indian.latitude,
      lng: indian.longitude,
    };
  } catch {
    return null;
  }
}

interface LiveCityWeather {
  city: string;
  lat: number;
  lng: number;
  tempC: number;
  currentRainMm: number;
  windKmh: number;
  maxDailyRainMm: number;
  rainyDays: number;
  maxTempC: number;
  weatherCode: number;
  observedAt: string;
}

async function fetchLiveCityWeather(
  city: string,
  lat: number,
  lng: number,
): Promise<LiveCityWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&daily=precipitation_sum,temperature_2m_max,weather_code&timezone=Asia%2FKolkata`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        rain?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        precipitation_sum?: number[];
        temperature_2m_max?: number[];
        weather_code?: number[];
      };
    };
    const dailyPrecip = data.daily?.precipitation_sum ?? [];
    const dailyMaxTemp = data.daily?.temperature_2m_max ?? [];
    const maxDailyRainMm = dailyPrecip.length ? Math.max(...dailyPrecip) : 0;
    const rainyDays = dailyPrecip.filter((mm) => mm >= 10).length;
    const maxTempC = dailyMaxTemp.length
      ? Math.max(...dailyMaxTemp)
      : (data.current?.temperature_2m ?? 30);

    return {
      city,
      lat,
      lng,
      tempC: Math.round((data.current?.temperature_2m ?? 30) * 10) / 10,
      currentRainMm: data.current?.rain ?? data.current?.precipitation ?? 0,
      windKmh: Math.round(data.current?.wind_speed_10m ?? 0),
      maxDailyRainMm: Math.round(maxDailyRainMm * 10) / 10,
      rainyDays,
      maxTempC: Math.round(maxTempC * 10) / 10,
      weatherCode: data.current?.weather_code ?? 0,
      observedAt: data.current?.time ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

interface RssNewsItem {
  title: string;
  link: string;
  pubDate: string;
  sourceName: string;
}

async function fetchGoogleNewsRssItems(query: string): Promise<RssNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query,
    )}&hl=en-IN&gl=IN&ceid=IN:en`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DeepTierLiveMonitor/1.0' },
      signal: AbortSignal.timeout(5500),
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return itemMatches
      .slice(0, 6)
      .map((itemXml) => {
        const titleRaw = itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
        const linkRaw = itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '';
        const pubRaw = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '';
        const sourceRaw =
          itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? '';
        const cleanTitle = decodeXmlEntities(titleRaw).replace(/\s+-\s+[^-]+$/, '');
        return {
          title: cleanTitle,
          link: decodeXmlEntities(linkRaw),
          pubDate: decodeXmlEntities(pubRaw),
          sourceName: decodeXmlEntities(sourceRaw) || 'Google News India',
        };
      })
      .filter((it) => it.title && it.link);
  } catch {
    return [];
  }
}

const GROUP_SEARCH_TERMS: Record<string, string[]> = {
  milk: ['milk', 'dairy', 'cattle fodder'],
  butter_ghee: ['butter', 'ghee', 'dairy'],
  sugar: ['sugar', 'sugarcane'],
  flour: ['wheat flour', 'atta', 'maida', 'wheat'],
  bread: ['wheat flour', 'bakery', 'bread'],
  gas: ['LPG cylinder', 'commercial gas'],
  oil: ['edible oil', 'palm oil', 'cooking oil'],
  tea: ['tea auction', 'tea price', 'tea leaves'],
  coffee: ['coffee bean', 'coffee price'],
  vegetables: ['tomato onion', 'vegetable price', 'mandi'],
  spices: ['turmeric chilli', 'spice market'],
  medicines: ['pharma medicine', 'drug API', 'pharmaceutical supply'],
  packaging: ['kraft paper', 'packaging carton'],
  hardware: ['steel fastener', 'hardware foundry'],
  electrical: ['copper cable', 'electrical equipment'],
  fabric: ['cotton yarn', 'textile tiruppur surat'],
};

const GROUP_MATCH_REGEX: Record<string, RegExp> = {
  milk: /\bmilk\b|\bdairy\b|aavin|amul|\bfodder\b|\bcattle\b|\bpaneer\b|paal|doodh/,
  butter_ghee: /\bbutter\b|\bghee\b|\bcreamery\b|\bdairy\b|\bmilk\b/,
  sugar: /\bsugar\b|\bsugarcane\b|\bjaggery\b/,
  flour: /\bflour\b|\bwheat\b|\batta\b|\bmaida\b|\broller mill\b/,
  bread: /\bbread\b|\bbakery\b|\bflour\b|\bwheat\b|\byeast\b|\bmaida\b/,
  gas: /\blpg\b|\bgas cylinder\b|\bcooking gas\b|\bcommercial gas\b|\bpropane\b|\bbutane\b/,
  oil: /\bedible oil\b|\bpalm oil\b|\bsunflower oil\b|\bmustard oil\b|\bcooking oil\b|\bsoy oil\b/,
  tea: /\btea\b|\bchai\b|\bnilgiri\b|\bassam tea\b|\bctc\b/,
  coffee: /\bcoffee\b|\barabica\b|\brobusta\b/,
  vegetables: /\btomato\b|\bonion\b|\bpotato\b|\bvegetable\b|\bvegetables\b|\bmandi\b/,
  spices: /\bspice\b|\bspices\b|\bturmeric\b|\bchilli\b|\bcoriander\b|\bmasala\b|\bcardamom\b/,
  medicines:
    /\bmedicine\b|\bmedicines\b|\bpharma\b|\bpharmaceutical\b|\btablet\b|\bsyrup\b|\bbulk drug\b|\bantibiotic\b|\binsulin\b/,
  packaging:
    /\bkraft paper\b|\bpackaging\b|\bcardboard\b|\bcarton\b|\bcorrugated\b|\bpolymer\b|\bcarry bag\b/,
  hardware: /\bsteel\b|\bhardware\b|\bfoundry\b|\bfastener\b|\bcement\b|\bmetal\b|\biron\b/,
  electrical:
    /\bcopper\b|\bcable\b|\belectrical\b|\belectronics\b|\btransformer\b|\bswitchgear\b|\bsemiconductor\b/,
  fabric: /\bcotton\b|\byarn\b|\btextile\b|\bfabric\b|\bgarment\b|\bhandloom\b|\bpowerloom\b/,
};

function buildDynamicGroupKeywords(
  suppliers: Array<Record<string, unknown>>,
  supplierGroups: string[],
): { queryTerms: string[]; customRegexByGroup: Map<string, RegExp> } {
  const terms: string[] = [];
  const customRegexByGroup = new Map<string, RegExp>();

  const orderedGroups = [...supplierGroups].sort((a, b) => {
    const aSec = a === 'packaging' || a === 'gas' ? 1 : 0;
    const bSec = b === 'packaging' || b === 'gas' ? 1 : 0;
    return aSec - bSec;
  });

  for (const s of suppliers) {
    const grp = typeof s.group === 'string' ? s.group.trim() : '';
    const item = typeof s.itemSupplied === 'string' ? s.itemSupplied.trim() : '';
    if (grp && !GROUP_MATCH_REGEX[grp.toLowerCase()] && item) {
      const words = item
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !['bulk', 'fresh', 'stock', 'shop', 'supply'].includes(w));
      if (words.length > 0) {
        terms.push(words.slice(0, 2).join(' '));
        const escaped = words.map((w) => `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        customRegexByGroup.set(grp, new RegExp(escaped.join('|'), 'i'));
      }
    }
  }

  for (const g of orderedGroups) {
    const mapped = GROUP_SEARCH_TERMS[g.toLowerCase()];
    if (mapped) {
      terms.push(...mapped.slice(0, 2));
    } else {
      const clean = g.replace(/_/g, ' ').trim();
      if (clean.length >= 3) terms.push(clean);
    }
  }

  return {
    queryTerms: Array.from(new Set(terms)),
    customRegexByGroup,
  };
}

function classifyLiveHeadlineToEvent(
  item: RssNewsItem,
  shopCity: string,
  supplierCities: string[],
  supplierGroups: string[],
  customRegexByGroup: Map<string, RegExp>,
  fallbackLat: number,
  fallbackLng: number,
  cityCoordMap: Map<string, { lat: number; lng: number }>,
) {
  const lower = item.title.toLowerCase();

  let type = 'raw_material_shortage';
  if (/flood|waterlog|heavy rain|monsoon|deluge|inundat|\brain\b/.test(lower)) {
    type = 'flood';
  } else if (/cyclone|storm|gale|depression/.test(lower)) {
    type = 'cyclone';
  } else if (/heatwave|heat wave|scorching/.test(lower)) {
    type = 'heatwave';
  } else if (/strike|bandh|protest|agitation|union|chakka/.test(lower)) {
    type = 'transport_strike';
  } else if (/power cut|outage|blackout|electricity|grid/.test(lower)) {
    type = 'power_outage';
  } else if (/petrol|diesel|fuel price|fuel hike/.test(lower)) {
    type = 'fuel_price_hike';
  } else if (/lpg|gas cylinder|cooking gas|commercial gas/.test(lower)) {
    type = 'gas_shortage';
  } else if (/port|harbour|cargo|vessel|congestion|berth/.test(lower)) {
    type = 'port_congestion';
  } else if (/highway|traffic|road closure|blockade|landslide|bridge/.test(lower)) {
    type = 'highway_blockade';
  } else if (/\bfire\b|blaze/.test(lower)) {
    type = 'factory_fire';
  } else if (/price|costlier|hike|surge|inflation|rate|soar|jump/.test(lower)) {
    type = 'material_price_spike';
  } else if (/\bban\b|restrict|export|curb/.test(lower)) {
    type = 'export_ban';
  } else if (/water shortage|drought|scarcity/.test(lower)) {
    type = 'water_shortage';
  } else if (/disease|pest|lumpy|blight/.test(lower)) {
    type = /cattle|milk|dairy|cow|lumpy/.test(lower) ? 'cattle_disease' : 'crop_disease';
  }

  const upstreamCities = supplierCities.filter(
    (c) => c.toLowerCase() !== shopCity.toLowerCase(),
  );
  const matchedCity =
    upstreamCities.find((c) =>
      new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(item.title),
    ) ??
    (new RegExp(`\\b${shopCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(item.title)
      ? shopCity
      : undefined);

  let matchedGroup = supplierGroups.find((g) => {
    const rx = GROUP_MATCH_REGEX[g.toLowerCase()] ?? customRegexByGroup.get(g);
    return rx ? rx.test(lower) : lower.includes(g.replace(/_/g, ' ').toLowerCase());
  });
  if (!matchedGroup && type === 'gas_shortage' && supplierGroups.includes('gas')) {
    matchedGroup = 'gas';
  }

  const isMaterial =
    type === 'material_price_spike' ||
    type === 'raw_material_shortage' ||
    type === 'gas_shortage' ||
    type === 'export_ban' ||
    type === 'crop_disease' ||
    type === 'cattle_disease';

  const target =
    isMaterial && matchedGroup
      ? matchedGroup
      : matchedCity
        ? matchedCity
        : matchedGroup
          ? type === 'flood' || type === 'transport_strike'
            ? shopCity
            : matchedGroup
          : shopCity;

  const effectiveType =
    !isMaterial && !matchedCity && matchedGroup ? 'raw_material_shortage' : type;

  const isSevereDisruption =
    /red alert|severe|flood|cyclone|halt|shutdown|\bban\b|crisis|blockade|chakka|bandh|\bfire\b/.test(
      lower,
    );
  const isModDisruption =
    /strike|shortage|warning|alert|disrupt|surge|hike|soar|jump|congestion|delay|outage|\brain\b/.test(
      lower,
    );

  const pctMatch = item.title.match(/(\d{1,2})\s*%/);
  const dayMatch = item.title.match(/(\d{1,2})[-\s]*(?:day|days)\b/i);
  const isPrice =
    effectiveType === 'material_price_spike' || effectiveType === 'fuel_price_hike';
  const pricePct = isPrice
    ? pctMatch
      ? Math.min(0.5, Math.max(0.06, Number(pctMatch[1]) / 100))
      : isSevereDisruption
        ? 0.22
        : 0.12
    : null;

  const severity =
    isPrice && pricePct
      ? Math.min(1, Math.max(0.24, pricePct / 0.5))
      : isSevereDisruption
        ? 0.68
        : isModDisruption
          ? 0.48
          : 0.24;

  const durationDays = dayMatch
    ? Math.min(21, Math.max(1, Number(dayMatch[1])))
    : isSevereDisruption
      ? 6
      : isModDisruption
        ? 4
        : 2;

  const parsedDate = item.pubDate ? Date.parse(item.pubDate) : NaN;
  const isoDate = Number.isNaN(parsedDate)
    ? new Date().toISOString().slice(0, 10)
    : new Date(parsedDate).toISOString().slice(0, 10);
  const regionName = matchedCity ?? shopCity;
  const regionCoords = cityCoordMap.get(regionName);

  const relevanceScore =
    (matchedCity ? 3 : 0) +
    (matchedGroup ? 3 : 0) +
    (isSevereDisruption ? 2 : isModDisruption ? 1 : 0);

  return {
    relevanceScore,
    matchedCity,
    matchedGroup,
    event: {
      title: item.title,
      type: effectiveType,
      target,
      region: regionName,
      lat: regionCoords?.lat ?? fallbackLat,
      lng: regionCoords?.lng ?? fallbackLng,
      severity: Math.round(severity * 100) / 100,
      pricePct,
      durationDays,
      confidence: matchedCity || matchedGroup ? 0.84 : 0.72,
      sourceKind: isSevereDisruption ? 'govt alert' : 'news',
      sourceName: item.sourceName,
      sourceUrl: item.link,
      sourceText: item.title,
      translation: `${item.sourceName}: ${item.title}`,
      publishedDate: isoDate,
    },
  };
}

export function createApiApp(): express.Express {
  const app = express();

  // Permissive CORS for cross-origin hosting and preview deployments
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // Gracefully handle malformed JSON requests
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
      return;
    }
    next(err);
  });

  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      provider: 'groq',
      model: GROQ_MODEL,
      groqConfigured: Boolean(getGroqApiKey()),
    });
  });

  router.get('/geo/search', async (req, res) => {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.json({ ok: true, results: [] });
      return;
    }
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q,
      )}&count=6&language=en&format=json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) {
        res.status(502).json({ ok: false, error: 'Location search failed', results: [] });
        return;
      }
      const data = (await resp.json()) as {
        results?: Array<{
          name?: string;
          admin1?: string;
          country?: string;
          country_code?: string;
          latitude?: number;
          longitude?: number;
        }>;
      };
      const items = (data.results ?? [])
        .filter((r) => r.name && typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .sort((a, b) => {
          const aIn = a.country_code === 'IN' ? 0 : 1;
          const bIn = b.country_code === 'IN' ? 0 : 1;
          return aIn - bIn;
        })
        .map((r) => ({
          city: r.name!,
          state: r.admin1 || r.country || 'India',
          lat: r.latitude!,
          lng: r.longitude!,
        }));
      res.json({ ok: true, results: items });
    } catch {
      res.status(502).json({ ok: false, error: 'Location search unavailable', results: [] });
    }
  });

  router.post('/geo/reverse', async (req, res) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ ok: false, error: 'Invalid coordinates' });
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        String(lat),
      )}&lon=${encodeURIComponent(String(lng))}&format=json`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'DeepTierSupply/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) {
        res.status(502).json({ ok: false, error: 'Could not detect city name' });
        return;
      }
      const data = (await resp.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          suburb?: string;
          state_district?: string;
          state?: string;
        };
      };
      const addr = data.address ?? {};
      const city =
        addr.city || addr.town || addr.village || addr.state_district || addr.suburb || 'Chennai';
      const state = addr.state || 'India';
      res.json({ ok: true, location: { city, state, lat, lng } });
    } catch {
      res.status(502).json({ ok: false, error: 'Reverse geocoding failed' });
    }
  });

  /**
   * Reads local-language supply trouble text via Groq API and extracts structured tags only.
   * Never generates risk scores, stock days, or money amounts (all numbers come from /src/engine).
   */
  router.post('/groq/read-news', async (req, res) => {
    const groqKey = getGroqApiKey();
    if (!groqKey) {
      res.status(503).json({ error: 'Groq service unavailable', fallback: true });
      return;
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const sourceType = typeof req.body?.sourceType === 'string' ? req.body.sourceType : 'local_news';
    const knownCities = Array.isArray(req.body?.knownCities)
      ? req.body.knownCities.filter((c: unknown) => typeof c === 'string')
      : [];
    const knownSuppliers = Array.isArray(req.body?.knownSuppliers)
      ? req.body.knownSuppliers.filter((s: unknown) => typeof s === 'string')
      : [];
    const knownGroups = Array.isArray(req.body?.knownGroups)
      ? req.body.knownGroups.filter((g: unknown) => typeof g === 'string')
      : [];

    if (!text) {
      res.status(400).json({ error: 'Missing text input' });
      return;
    }

    const ALLOWED_EVENT_TYPES = [
      'Flood',
      'Cyclone or storm',
      'Heatwave or drought',
      'Fire or explosion',
      'Earthquake or landslide',
      'Labour strike',
      'Bandh or road blockade',
      'Truckers strike',
      'Power cut',
      'Fuel or gas shortage',
      'Port or road closure',
      'Cyber attack',
      'Supplier shuts down',
      'Price spike',
      'Export ban or new duty',
      'Licence or safety closure',
      'Disease or pest outbreak',
      'Quality recall',
    ];

    const SYSTEM_INSTRUCTION = [
      'You are a supply-chain risk assistant for shops and factories in India.',
      'The input is a news item, government notice or forwarded message in any Indian language or English.',
      '1) Detect the language name (e.g. Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, English).',
      '2) Translate faithfully into simple English.',
      `3) Find disruption events. Allowed event types MUST be one of: ${ALLOWED_EVENT_TYPES.join(', ')}.`,
      "4) Set target to one of the cities in the app's data (map spellings: Tuticorin = Thoothukudi, Madras = Chennai, Vizag = Visakhapatnam, Cochin = Kochi), OR the material group for price, ban and recall events, OR the supplier name if one is named.",
      '5) Score severity: 0.2 minor, 0.4 moderate, 0.6 serious, 0.8 severe, 1.0 catastrophic.',
      '6) For price events give pricePct as a decimal (e.g. 0.35 for 35%), else null.',
      '7) Give durationDays as an integer only if the text implies it, else null.',
      '8) Give confidence 0..1 and mark sourceKind as one of: official, news, forward.',
      '9) Never invent facts. Return ONLY a JSON object with keys: language, translation, sourceKind, events (each event: type, target, severity, pricePct, durationDays, confidence, evidence). Return an empty events array if nothing relevant.',
    ].join(' ');

    try {
      const contextHints = [
        knownCities.length ? `Cities in app data: ${knownCities.join(', ')}.` : '',
        knownGroups.length ? `Material groups: ${knownGroups.join(', ')}.` : '',
        knownSuppliers.length ? `Known supplier names: ${knownSuppliers.join(', ')}.` : '',
        `Hint from sender selection: ${sourceType}.`,
      ]
        .filter(Boolean)
        .join('\n');

      const parsed = await callGroqJson(
        groqKey,
        SYSTEM_INSTRUCTION,
        `${contextHints}\n\nInput message:\n"""${text}"""`,
        9000,
        0.1,
      );

      res.json({ ok: true, result: parsed, readerMode: 'groq' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Groq request failed';
      res.status(502).json({ error: message, fallback: true });
    }
  });

  /**
   * Turns deterministic engine numbers into a friendly grade-6 explanation without altering numbers.
   */
  router.post('/groq/explain', async (req, res) => {
    const groqKey = getGroqApiKey();
    if (!groqKey) {
      res.status(503).json({ error: 'Groq service unavailable', fallback: true });
      return;
    }

    const payload = req.body?.summary;
    const uiLanguage = typeof req.body?.uiLanguage === 'string' ? req.body.uiLanguage : 'en';
    if (!payload) {
      res.status(400).json({ error: 'Missing engine summary' });
      return;
    }

    try {
      const langName =
        uiLanguage === 'ta' ? 'Tamil' : uiLanguage === 'hi' ? 'Hindi' : 'English';
      const parsed = await callGroqJson(
        groqKey,
        'Use grade-6 plain language. Never use technical terms like tier, knowledge graph, node, edge, entity, NLP, LLM, Monte Carlo, Cypher, buffer, locality, or dependency. Use layer, chain map, supplier, link, and stock days instead. Never change or invent any numbers. Return ONLY JSON: { "sentences": ["...", "...", "..."] }.',
        `Explain this calculated supply warning in 3 short grade-6 sentences in ${langName}. Keep every number exact as given. Data: ${JSON.stringify(payload)}`,
        8000,
        0.2,
      );

      res.json({ ok: true, sentences: parsed.sentences, readerMode: 'groq' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Groq explain failed';
      res.status(502).json({ error: message, fallback: true });
    }
  });

  /**
   * Fetches real, current-world Open-Meteo weather observations & Google News India RSS feeds
   * for the user's exact shop city and supplier chain, then uses Groq API (when GROQ_API_KEY
   * is set) to rank, classify, and summarize them cleanly without ever inventing disasters or URLs.
   */
  router.post('/groq/live-world-alerts', async (req, res) => {
    const shopName =
      typeof req.body?.shopName === 'string' && req.body.shopName.trim()
        ? req.body.shopName.trim()
        : 'My Shop';
    const shopCategory =
      typeof req.body?.shopCategory === 'string' && req.body.shopCategory.trim()
        ? req.body.shopCategory.trim()
        : 'Retail shop';
    const shopCity =
      typeof req.body?.shopCity === 'string' && req.body.shopCity.trim()
        ? req.body.shopCity.trim()
        : 'Chennai';
    const shopState =
      typeof req.body?.shopState === 'string' ? req.body.shopState.trim() : '';
    const uiLanguage =
      req.body?.uiLanguage === 'ta'
        ? 'Tamil'
        : req.body?.uiLanguage === 'hi'
          ? 'Hindi'
          : 'English';

    const suppliers: Array<Record<string, unknown>> = Array.isArray(req.body?.suppliers)
      ? req.body.suppliers
          .filter(
            (s: unknown): s is Record<string, unknown> => Boolean(s && typeof s === 'object'),
          )
          .slice(0, 30)
      : [];
    const supplierCities: string[] = Array.from(
      new Set<string>([
        shopCity,
        ...suppliers
          .map((s) => (typeof s.city === 'string' ? s.city.trim() : ''))
          .filter((v): v is string => Boolean(v)),
      ]),
    );
    const upstreamCities = supplierCities.filter(
      (c) => c.toLowerCase() !== shopCity.toLowerCase(),
    );
    const supplierGroups: string[] = Array.from(
      new Set<string>(
        suppliers
          .map((s) => (typeof s.group === 'string' ? s.group.trim() : ''))
          .filter((v): v is string => Boolean(v)),
      ),
    );

    const todayIso = new Date().toISOString().slice(0, 10);
    const nowDisplay = new Date().toISOString();

    const resolvedShopLoc = await resolveCityViaOpenMeteo(shopCity);
    const cityCoordMap = new Map<string, { lat: number; lng: number }>();
    if (resolvedShopLoc) {
      cityCoordMap.set(shopCity, {
        lat: resolvedShopLoc.lat,
        lng: resolvedShopLoc.lng,
      });
    }
    for (const s of suppliers) {
      if (
        typeof s?.city === 'string' &&
        typeof s?.lat === 'number' &&
        typeof s?.lng === 'number' &&
        !cityCoordMap.has(s.city)
      ) {
        cityCoordMap.set(s.city, { lat: s.lat, lng: s.lng });
      }
    }

    try {
      const targetWeatherCities = supplierCities.slice(0, 6);
      const { queryTerms, customRegexByGroup } = buildDynamicGroupKeywords(
        suppliers,
        supplierGroups,
      );

      const localCityQuery = `"${shopCity}" ${shopState ? `OR "${shopState}"` : ''} (rain OR flood OR storm OR strike OR power OR traffic OR highway OR water OR market)`;
      const upstreamCityList = upstreamCities.slice(0, 4);
      const upstreamQuery =
        upstreamCityList.length > 0
          ? `(${upstreamCityList.map((c) => `"${c}"`).join(' OR ')}) (rain OR flood OR strike OR port OR mill OR mandi OR highway OR shortage)`
          : '';
      const commodityTerms =
        queryTerms.slice(0, 6).map((t) => `"${t}"`).join(' OR ') || '"milk" OR "wheat flour" OR "LPG"';
      const marketQuery = `India (${commodityTerms}) (price OR shortage OR supply OR rate OR mandi OR disruption)`;

      const [weatherResults, localNews, upstreamNews, marketNews] = await Promise.all([
        Promise.all(
          targetWeatherCities.map(async (c) => {
            let coords = cityCoordMap.get(c);
            if (!coords) {
              const geo = await resolveCityViaOpenMeteo(c);
              if (geo) {
                coords = { lat: geo.lat, lng: geo.lng };
                cityCoordMap.set(c, coords);
              }
            }
            if (!coords) return null;
            return fetchLiveCityWeather(c, coords.lat, coords.lng);
          }),
        ),
        fetchGoogleNewsRssItems(localCityQuery),
        upstreamQuery ? fetchGoogleNewsRssItems(upstreamQuery) : Promise.resolve([]),
        fetchGoogleNewsRssItems(marketQuery),
      ]);

      const shopLat = resolvedShopLoc?.lat ?? 13.0827;
      const shopLng = resolvedShopLoc?.lng ?? 80.2707;
      const baselineAlerts: Array<Record<string, unknown>> = [];
      const liveSources: Array<{ title: string; url: string }> = [];
      const seenUrls = new Set<string>();

      const validWeathers = weatherResults.filter(
        (w): w is NonNullable<typeof w> => Boolean(w),
      );

      // 1. Emit genuine inclement weather alerts from live Open-Meteo telemetry
      for (const w of validWeathers) {
        const isSevereRain =
          w.maxDailyRainMm >= 35 || w.currentRainMm >= 8 || w.weatherCode >= 95;
        const isModRain =
          !isSevereRain &&
          (w.maxDailyRainMm >= 12 || w.currentRainMm >= 2.5 || w.weatherCode >= 61);
        const isHighWind = w.windKmh >= 35;
        const isHeat = w.maxTempC >= 38;

        const omUrl = `https://open-meteo.com/en/docs?latitude=${w.lat}&longitude=${w.lng}`;
        if (!seenUrls.has(omUrl)) {
          seenUrls.add(omUrl);
          liveSources.push({
            title: `Open-Meteo Live Weather · ${w.city}`,
            url: omUrl,
          });
        }

        if (!isSevereRain && !isModRain && !isHighWind && !isHeat) {
          continue;
        }

        const alertType =
          isSevereRain || isHighWind
            ? w.weatherCode >= 95 || isHighWind
              ? 'cyclone'
              : 'flood'
            : isModRain
              ? 'flood'
              : 'heatwave';

        const severity = isSevereRain
          ? Math.min(0.92, Math.max(0.62, 0.56 + w.maxDailyRainMm / 240))
          : isHighWind
            ? Math.min(0.78, Math.max(0.38, 0.36 + (w.windKmh - 35) / 80))
            : isModRain
              ? Math.min(0.58, Math.max(0.34, 0.28 + w.maxDailyRainMm / 120))
              : Math.min(0.8, Math.max(0.38, 0.36 + (w.maxTempC - 38) / 14));

        const durationDays = isSevereRain
          ? Math.max(3, w.rainyDays + 1)
          : isModRain
            ? Math.max(2, w.rainyDays)
            : isHighWind
              ? 2
              : Math.max(3, Math.round(w.maxTempC - 35));

        const weatherHeadline = isSevereRain
          ? `Heavy rain warning in ${w.city}: ${w.maxDailyRainMm}mm forecast`
          : isHighWind
            ? `Strong wind alert in ${w.city}: ${w.windKmh} km/h gusts`
            : isModRain
              ? `Rain showers across ${w.city}: ${w.maxDailyRainMm}mm expected`
              : `High heat alert in ${w.city}: up to ${w.maxTempC}°C`;

        const weatherSummary =
          isSevereRain || isModRain
            ? `Live Open-Meteo forecast for ${w.city} shows up to ${w.maxDailyRainMm}mm rain over ${w.rainyDays} day(s) (currently ${w.tempC}°C).`
            : isHighWind
              ? `Live Open-Meteo reading for ${w.city} shows ${w.windKmh} km/h winds (currently ${w.tempC}°C).`
              : `Live Open-Meteo reading for ${w.city} shows peak temperatures near ${w.maxTempC}°C (currently ${w.tempC}°C).`;

        baselineAlerts.push({
          title: weatherHeadline,
          type: alertType,
          target: w.city,
          region: w.city,
          lat: w.lat,
          lng: w.lng,
          severity: Math.round(severity * 100) / 100,
          pricePct: null,
          durationDays,
          confidence: 0.9,
          sourceKind: isSevereRain || isHeat || isHighWind ? 'govt alert' : 'news',
          sourceName: 'Open-Meteo Live Forecast',
          sourceUrl: omUrl,
          sourceText: weatherSummary,
          translation: weatherSummary,
          publishedDate: todayIso,
        });
      }

      // 2. Interleave & classify live Google News India RSS headlines
      const interleavedRss: RssNewsItem[] = [];
      const maxLen = Math.max(marketNews.length, upstreamNews.length, localNews.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (marketNews[i]) interleavedRss.push(marketNews[i]);
        if (upstreamNews[i]) interleavedRss.push(upstreamNews[i]);
        if (localNews[i]) interleavedRss.push(localNews[i]);
      }

      const seenTitles = new Set<string>();
      const scoredNews: Array<{
        relevanceScore: number;
        matchedCity?: string;
        item: RssNewsItem;
        event: Record<string, unknown>;
      }> = [];

      for (const item of interleavedRss) {
        const key = item.title.toLowerCase();
        if (seenTitles.has(key)) continue;
        seenTitles.add(key);

        const classified = classifyLiveHeadlineToEvent(
          item,
          shopCity,
          supplierCities,
          supplierGroups,
          customRegexByGroup,
          shopLat,
          shopLng,
          cityCoordMap,
        );
        scoredNews.push({
          relevanceScore: classified.relevanceScore,
          matchedCity: classified.matchedCity,
          item,
          event: classified.event,
        });
      }

      scoredNews.sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          Number(b.event.severity ?? 0) - Number(a.event.severity ?? 0),
      );

      const targetCounts = new Map<string, number>();
      for (const a of baselineAlerts) {
        const tgt = String(a.target ?? '').toLowerCase();
        targetCounts.set(tgt, (targetCounts.get(tgt) ?? 0) + 1);
      }

      for (const entry of scoredNews) {
        if (baselineAlerts.length >= 7) break;
        const tgtKey = String(entry.event.target ?? '').toLowerCase();
        if ((targetCounts.get(tgtKey) ?? 0) >= 2) continue;
        targetCounts.set(tgtKey, (targetCounts.get(tgtKey) ?? 0) + 1);

        if (!seenUrls.has(entry.item.link)) {
          seenUrls.add(entry.item.link);
          liveSources.push({
            title: `${entry.item.sourceName}: ${entry.item.title}`,
            url: entry.item.link,
          });
        }
        baselineAlerts.push(entry.event);
      }

      const shopW = validWeathers[0];
      if (baselineAlerts.length === 0 && shopW) {
        baselineAlerts.push({
          title: `Calm conditions across ${shopW.city} & upstream hubs`,
          type: 'flood',
          target: shopW.city,
          region: shopW.city,
          lat: shopW.lat,
          lng: shopW.lng,
          severity: 0.14,
          pricePct: null,
          durationDays: 1,
          confidence: 0.9,
          sourceKind: 'news',
          sourceName: 'Open-Meteo Live Forecast',
          sourceUrl: `https://open-meteo.com/en/docs?latitude=${shopW.lat}&longitude=${shopW.lng}`,
          sourceText: `Live Open-Meteo conditions in ${shopW.city} are calm (${shopW.tempC}°C, ${shopW.currentRainMm}mm rain).`,
          translation: `Live conditions in ${shopW.city} are steady (${shopW.tempC}°C, ${shopW.currentRainMm}mm rain) with no major alerts.`,
          publishedDate: todayIso,
        });
      }

      if (baselineAlerts.length === 0) {
        res.status(502).json({
          ok: false,
          error: 'Could not retrieve live weather or news feeds right now.',
        });
        return;
      }

      const upstreamSummaryList = validWeathers
        .slice(1, 3)
        .map((w) => `${w.city} ${w.tempC}°C (${w.maxDailyRainMm}mm max)`)
        .join(', ');
      const summaryLead = shopW
        ? `Live conditions in ${shopW.city}: ${shopW.tempC}°C (${shopW.currentRainMm}mm rain, max ${shopW.maxDailyRainMm}mm ahead)${
            upstreamSummaryList ? ` · Upstream hubs: ${upstreamSummaryList}` : ''
          }`
        : `Live scan for ${shopCity}`;
      const newsLead =
        scoredNews.length > 0
          ? `${scoredNews.length} live news reports scanned for ${shopCategory} routes.`
          : 'no active local news disruptions reported.';
      let finalSummary = `${summaryLead} · ${newsLead}`;
      let finalAlerts = baselineAlerts;
      let sourceMode: 'groq-live' | 'live-feeds' = 'live-feeds';
      let notice: string | undefined;

      // 3. Weather + Severe-News Dynamic Node Transit Adjustments (kept exact per real conditions)
      const weatherByCity = new Map(
        validWeathers.map((w) => [w.city.toLowerCase(), w]),
      );
      const disruptedNewsCities = new Set<string>();
      for (const entry of scoredNews) {
        if (entry.matchedCity && Number(entry.event.severity ?? 0) >= 0.55) {
          disruptedNewsCities.add(entry.matchedCity.toLowerCase());
        }
      }

      const nodeAdjustments: Record<
        string,
        {
          nodeId: string;
          transitDays?: number;
          onTimeDeliveryPct?: number;
          reliabilityScore?: number;
        }
      > = {};
      for (const sup of suppliers) {
        const id = typeof sup.id === 'string' ? sup.id : '';
        const city = typeof sup.city === 'string' ? sup.city.toLowerCase() : '';
        if (!id || !city) continue;
        const w = weatherByCity.get(city);
        const hasSevereNews = disruptedNewsCities.has(city);
        const isSevereWeather = Boolean(
          w && (w.maxDailyRainMm >= 35 || w.currentRainMm >= 8 || w.weatherCode >= 95),
        );
        const isModWeather = Boolean(
          w &&
            !isSevereWeather &&
            (w.maxDailyRainMm >= 12 || w.windKmh >= 35 || w.maxTempC >= 38),
        );
        const layer = typeof sup.layer === 'number' ? sup.layer : 1;
        const baseTransit =
          typeof sup.transitDays === 'number' && sup.transitDays > 0
            ? sup.transitDays
            : layer === 1
              ? 1
              : 2;

        if (isSevereWeather) {
          nodeAdjustments[id] = {
            nodeId: id,
            transitDays: baseTransit + 2,
            onTimeDeliveryPct: 72,
            reliabilityScore: 0.71,
          };
        } else if (isModWeather || hasSevereNews) {
          nodeAdjustments[id] = {
            nodeId: id,
            transitDays: baseTransit + 1,
            onTimeDeliveryPct: 84,
            reliabilityScore: 0.82,
          };
        }
      }

      // 4. Grounded Groq Synthesis: pass the REAL Open-Meteo + RSS observations to Groq API
      const groqKey = getGroqApiKey();
      if (groqKey) {
        try {
          const groqPrompt = [
            `Today's real date: ${todayIso}.`,
            `Business: "${shopName}" (${shopCategory}) in ${shopCity}${shopState ? `, ${shopState}` : ''}, India.`,
            `Supplier cities: ${supplierCities.join(', ')}.`,
            `Tracked material groups: ${supplierGroups.join(', ') || 'milk, tea, sugar, gas, packaging'}.`,
            '',
            'LIVE OPEN-METEO TELEMETRY:',
            JSON.stringify(
              validWeathers.map((w) => ({
                city: w.city,
                tempC: w.tempC,
                currentRainMm: w.currentRainMm,
                maxDailyRainMm: w.maxDailyRainMm,
                rainyDays: w.rainyDays,
                windKmh: w.windKmh,
                maxTempC: w.maxTempC,
              })),
            ),
            '',
            'LIVE RSS CANDIDATE ALERTS (already matched to real URLs):',
            JSON.stringify(
              baselineAlerts.map((a, idx) => ({
                index: idx,
                title: a.title,
                type: a.type,
                target: a.target,
                region: a.region,
                severity: a.severity,
                durationDays: a.durationDays,
                pricePct: a.pricePct,
                sourceName: a.sourceName,
                sourceUrl: a.sourceUrl,
              })),
            ),
            '',
            'Instructions:',
            `- Write a concise 1-2 sentence worldSummary in ${uiLanguage} summarizing exact live temperatures/rainfall and relevant news.`,
            `- Review the candidate alerts above and refine up to 6 genuinely relevant alerts in JSON (do NOT invent new URLs or disasters; keep sourceUrl identical to the candidate's sourceUrl; write clear grade-6 translation in ${uiLanguage}).`,
            '- For type, use ONLY one of: flood, cyclone, heatwave, water_shortage, power_outage, transport_strike, port_congestion, highway_blockade, factory_fire, crop_disease, cattle_disease, raw_material_shortage, export_ban, gas_shortage, material_price_spike, fuel_price_hike, supplier_shutdown, cyber_attack.',
            '- Return ONLY valid JSON: { "worldSummary": string, "alerts": Array<{ title, type, target, region, severity, pricePct, durationDays, confidence, sourceKind, sourceName, sourceUrl, sourceText, translation, publishedDate }> }.',
          ].join('\n');

          const groqData = await callGroqJson(
            groqKey,
            'You are a supply-chain intelligence desk for Indian shops. Analyze ONLY the verified live weather readings and RSS headlines provided. Never invent fictional disasters, coordinates, or URLs. Return valid JSON only.',
            groqPrompt,
            8500,
            0.1,
          );

          if (typeof groqData.worldSummary === 'string' && groqData.worldSummary.trim()) {
            finalSummary = groqData.worldSummary.trim();
          }
          if (Array.isArray(groqData.alerts) && groqData.alerts.length > 0) {
            const validUrls = new Set(
              baselineAlerts.map((a) => String(a.sourceUrl || '')).filter(Boolean),
            );
            const cleaned = groqData.alerts
              .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
              .slice(0, 6)
              .map((item, idx) => {
                const fallbackAlert = baselineAlerts[idx] ?? baselineAlerts[0];
                const candidateUrl =
                  typeof item.sourceUrl === 'string' && validUrls.has(item.sourceUrl)
                    ? item.sourceUrl
                    : String(fallbackAlert?.sourceUrl || '');
                const regionStr =
                  typeof item.region === 'string' && item.region.trim()
                    ? item.region.trim()
                    : String(fallbackAlert?.region || shopCity);
                const coords = cityCoordMap.get(regionStr);
                return {
                  title:
                    typeof item.title === 'string' && item.title.trim()
                      ? item.title.trim()
                      : String(fallbackAlert?.title || 'Supply update'),
                  type:
                    typeof item.type === 'string' && item.type.trim()
                      ? item.type.trim()
                      : String(fallbackAlert?.type || 'raw_material_shortage'),
                  target:
                    typeof item.target === 'string' && item.target.trim()
                      ? item.target.trim()
                      : String(fallbackAlert?.target || shopCity),
                  region: regionStr,
                  lat: coords?.lat ?? Number(fallbackAlert?.lat ?? shopLat),
                  lng: coords?.lng ?? Number(fallbackAlert?.lng ?? shopLng),
                  severity:
                    typeof item.severity === 'number'
                      ? Math.min(1, Math.max(0.1, item.severity))
                      : Number(fallbackAlert?.severity ?? 0.3),
                  pricePct:
                    typeof item.pricePct === 'number'
                      ? item.pricePct
                      : (fallbackAlert?.pricePct ?? null),
                  durationDays:
                    typeof item.durationDays === 'number'
                      ? Math.min(30, Math.max(1, Math.round(item.durationDays)))
                      : Number(fallbackAlert?.durationDays ?? 2),
                  confidence:
                    typeof item.confidence === 'number'
                      ? Math.min(1, Math.max(0.2, item.confidence))
                      : Number(fallbackAlert?.confidence ?? 0.85),
                  sourceKind:
                    item.sourceKind === 'govt alert' || item.sourceKind === 'official'
                      ? 'govt alert'
                      : 'news',
                  sourceName:
                    typeof item.sourceName === 'string' && item.sourceName.trim()
                      ? item.sourceName.trim()
                      : String(fallbackAlert?.sourceName || 'Live Feed'),
                  sourceUrl: candidateUrl,
                  sourceText:
                    typeof item.sourceText === 'string' && item.sourceText.trim()
                      ? item.sourceText.trim()
                      : String(fallbackAlert?.sourceText || ''),
                  translation:
                    typeof item.translation === 'string' && item.translation.trim()
                      ? item.translation.trim()
                      : String(fallbackAlert?.translation || ''),
                  publishedDate:
                    typeof item.publishedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.publishedDate)
                      ? item.publishedDate
                      : todayIso,
                };
              });

            if (cleaned.length > 0) {
              finalAlerts = cleaned;
            }
          }
          sourceMode = 'groq-live';
        } catch (groqErr) {
          const gMsg = groqErr instanceof Error ? groqErr.message : 'Groq synthesis skipped';
          notice = `${gMsg} Showing live Open-Meteo weather & Google News RSS feeds directly.`;
        }
      } else {
        notice =
          'GROQ_API_KEY is not configured; showing live Open-Meteo weather & Google News RSS feeds directly.';
      }

      res.json({
        ok: true,
        sourceMode,
        notice,
        fetchedAt: nowDisplay,
        shopLocation: resolvedShopLoc,
        worldSummary: finalSummary,
        alerts: finalAlerts,
        nodeAdjustments,
        groundingSources: liveSources.slice(0, 6),
        webSearchQueries: [localCityQuery, upstreamQuery, marketQuery].filter(Boolean),
      });
    } catch (feedErr) {
      const msg =
        feedErr instanceof Error
          ? feedErr.message
          : 'Failed to retrieve live real-world feeds.';
      res.status(502).json({
        ok: false,
        error: msg,
      });
    }
  });

  // Mount at both /api and / so all hosting setups (Vercel serverless or standalone Express) resolve cleanly
  app.use('/api', router);
  app.use('/', router);

  return app;
}
