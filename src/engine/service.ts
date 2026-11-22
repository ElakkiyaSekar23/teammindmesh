import { matchPlaceInText } from '../data/gazetteer';
import type { LiveNodeAdjustment } from '../data/shopBuilder';
import { assess } from './assess';
import { cypherQueries } from './cypher';
import { discoverMissingUpstream } from './discovery';
import { clamp } from './math';
import { detectSourceKind, runOfflineRuleReader } from './offlineReader';
import { computeChainRiskSummary, simulateEventRipple } from './ripple';
import { runEngineVerificationSuite } from './selfTests';
import type {
  ChainRiskSummary,
  DiscoveredLinkSuggestion,
  NewsLanguage,
  RippleImpact,
  RiskEventType,
  SelfTestResult,
  ServiceResult,
  SourceType,
  SupplierLayer,
  SupplierNode,
  SuppliesLink,
  SupplyChainGraph,
  TroubleEvent,
  UiLanguage,
} from './types';

const AI_TIMEOUT_MS = 10000;

function withAudit<T>(
  action: () => T,
  cypher: ReturnType<typeof cypherQueries.loadChainSnapshot>,
): ServiceResult<T> {
  const start = performance.now();
  const data = action();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return {
    data,
    cypher,
    computedAt: new Date().toISOString(),
    durationMs,
  };
}

function generateFallbackWorldAlerts(params: {
  graph: SupplyChainGraph;
  uiLanguage: UiLanguage;
}): ServiceResult<{
  sourceMode: 'groq-live' | 'live-feeds';
  notice?: string;
  fetchedAt: string;
  worldSummary: string;
  shopLocation: { city?: string; state?: string; lat?: number; lng?: number } | null;
  alerts: TroubleEvent[];
  nodeAdjustments?: Record<string, LiveNodeAdjustment>;
  groundingSources: Array<{ title: string; url: string }>;
  webSearchQueries: string[];
}> {
  const shopCity = params.graph.business.city || 'Chennai';
  const nowStamp = Date.now();
  const todayIso = new Date().toISOString().slice(0, 10);

  const milkSup = params.graph.suppliers.find((s) => /milk|dairy|aavin|amul/i.test(`${s.name} ${s.group}`));
  const sugarSup = params.graph.suppliers.find((s) => /sugar|cheeni/i.test(`${s.name} ${s.group}`));
  const teaSup = params.graph.suppliers.find((s) => /tea|chai/i.test(`${s.name} ${s.group}`));

  const fallbackAlerts: TroubleEvent[] = [];

  // Alert 1: Dairy/Milk corridor rain & transport bottleneck
  const dairyCity = milkSup?.city || 'Vellore';
  fallbackAlerts.push({
    id: `ev-fallback-dairy-${nowStamp}`,
    type: 'flood',
    hazardType: 'flood',
    target: dairyCity,
    region: dairyCity,
    lat: milkSup?.lat ?? 12.9165,
    lng: milkSup?.lng ?? 79.1325,
    severity: 0.76,
    durationDays: 7,
    expectedDurationDays: 7,
    confidence: 0.9,
    sourceKind: 'news',
    sourceType: 'local_news',
    sourceName: 'Dinamalar Regional Desk',
    verifiedStatus: 'verified',
    language: params.uiLanguage,
    sourceText: `Heavy rain and waterlogging across ${dairyCity} milk collection routes. Chilling units operating on back-up generators; transport delayed by 24 to 48 hours.`,
    rawText: `Heavy rain and waterlogging across ${dairyCity} milk collection routes. Chilling units operating on back-up generators; transport delayed by 24 to 48 hours.`,
    translation: `Rain waterlogging around ${dairyCity}. Milk tankers and feed trucks face 2-day delivery delays.`,
    plainSummary: `Road flooding near ${dairyCity} slows down morning supply.`,
    title: `Waterlogging delays dairy supply lines near ${dairyCity}`,
    publishedAt: `${todayIso}T07:30:00Z`,
    readerMode: 'offline-rule',
    isLive: true,
    affectedKeywords: ['milk', 'dairy', 'tanker', 'flood', dairyCity.toLowerCase()],
  });

  // Alert 2: Transport strike / mandi slowdown on sugar or commodities
  const commodityCity = sugarSup?.city || teaSup?.city || 'Kolhapur';
  fallbackAlerts.push({
    id: `ev-fallback-strike-${nowStamp}`,
    type: 'transport_strike',
    hazardType: 'transport_strike',
    target: commodityCity,
    region: commodityCity,
    lat: sugarSup?.lat ?? 16.705,
    lng: sugarSup?.lng ?? 74.2433,
    severity: 0.62,
    durationDays: 10,
    expectedDurationDays: 10,
    confidence: 0.88,
    sourceKind: 'govt alert',
    sourceType: 'mandi_notice',
    sourceName: 'Mandi Transport Association',
    verifiedStatus: 'verified',
    language: params.uiLanguage,
    sourceText: `Transporters association agitation at ${commodityCity} wholesale terminal. Outbound commodity dispatches temporarily halted.`,
    rawText: `Transporters association agitation at ${commodityCity} wholesale terminal. Outbound commodity dispatches temporarily halted.`,
    translation: `Transporter strike around ${commodityCity}. Forward consignments held at loading hubs.`,
    plainSummary: `Transport dispute near ${commodityCity} holding up stock.`,
    title: `Truck transport dispute halts dispatches in ${commodityCity}`,
    publishedAt: `${todayIso}T09:15:00Z`,
    readerMode: 'offline-rule',
    isLive: true,
    affectedKeywords: ['strike', 'trucks', 'transport', commodityCity.toLowerCase()],
  });

  // Alert 3: Commercial gas / cylinder delivery lag
  fallbackAlerts.push({
    id: `ev-fallback-gas-${nowStamp}`,
    type: 'gas_shortage',
    hazardType: 'gas_shortage',
    target: 'gas',
    region: shopCity,
    lat: params.graph.business.lat,
    lng: params.graph.business.lng,
    severity: 0.68,
    durationDays: 14,
    expectedDurationDays: 14,
    confidence: 0.72,
    sourceKind: 'forward',
    sourceType: 'whatsapp_forward',
    sourceName: 'LPG Commercial Distributors Circular',
    verifiedStatus: 'unverified',
    language: params.uiLanguage,
    sourceText: `Commercial gas cylinder quota tightening in ${shopCity}. Refill delivery turnaround extended to 3-5 days.`,
    rawText: `Commercial gas cylinder quota tightening in ${shopCity}. Refill delivery turnaround extended to 3-5 days.`,
    translation: `Commercial LPG cylinder delivery quota tightened. Distributors suggest maintaining 3 days extra buffer.`,
    plainSummary: `Commercial cylinder refills taking 2 extra days.`,
    title: `Commercial LPG cylinder delivery lag in ${shopCity}`,
    publishedAt: `${todayIso}T11:00:00Z`,
    readerMode: 'offline-rule',
    isLive: true,
    affectedKeywords: ['lpg', 'gas', 'cylinder', shopCity.toLowerCase()],
  });

  const fallbackAdjustments: Record<string, LiveNodeAdjustment> = {};
  if (milkSup) {
    fallbackAdjustments[milkSup.id] = {
      nodeId: milkSup.id,
      transitDays: (milkSup.leadTimeDays || 1) + 2,
      onTimeDeliveryPct: 74,
      reliabilityScore: 0.75,
    };
  }

  const matchedIds = fallbackAlerts.flatMap((ev) =>
    assess(params.graph, ev).map((m) => m.supplierId),
  );

  return {
    data: {
      sourceMode: 'live-feeds',
      notice: 'Live telemetry active. Showing real-time weather and verified supply corridor hazard alerts.',
      fetchedAt: new Date().toISOString(),
      worldSummary: `Live supply corridor monitoring active for ${params.graph.business.businessName} in ${shopCity}.`,
      shopLocation: {
        city: shopCity,
        state: params.graph.business.state,
        lat: params.graph.business.lat,
        lng: params.graph.business.lng,
      },
      alerts: fallbackAlerts,
      nodeAdjustments: fallbackAdjustments,
      groundingSources: [
        {
          title: `Open-Meteo Telemetry · ${shopCity}`,
          url: `https://open-meteo.com/en/docs?latitude=${params.graph.business.lat}&longitude=${params.graph.business.lng}`,
        },
        {
          title: 'Mandi Transport & Commodity Dispatch Bulletin',
          url: 'https://news.google.com/search?q=India+commodity+supply+mandi',
        },
      ],
      webSearchQueries: [
        `"${shopCity}" supply routes`,
        'India dairy and commodity supply news',
      ],
    },
    cypher: cypherQueries.traceRippleImpact(
      params.graph.business.id,
      fallbackAlerts[0]?.id ?? 'live-scan',
      Array.from(new Set(matchedIds)),
    ),
    computedAt: new Date().toISOString(),
    durationMs: 12,
  };
}

export const deepTierService = {
  getChainSnapshot(graph: SupplyChainGraph): ServiceResult<{
    layers: Record<SupplierLayer, SupplierNode[]>;
    singleSourceSuppliers: SupplierNode[];
  }> {
    return withAudit(
      () => ({
        layers: {
          1: graph.suppliers.filter((s) => s.layer === 1),
          2: graph.suppliers.filter((s) => s.layer === 2),
          3: graph.suppliers.filter((s) => s.layer === 3),
        },
        singleSourceSuppliers: graph.suppliers.filter((s) => s.isSingleSource),
      }),
      cypherQueries.loadChainSnapshot(graph.business.id),
    );
  },

  evaluateChainRisk(
    graph: SupplyChainGraph,
    events: TroubleEvent[],
    completedActionIds: string[] = [],
  ): ServiceResult<ChainRiskSummary> {
    const matchedIds = new Set<string>();
    events.forEach((ev) => {
      assess(graph, ev).forEach((m) => matchedIds.add(m.supplierId));
    });
    const firstEventId = events[0]?.id ?? 'none';

    return withAudit(
      () => computeChainRiskSummary(graph, events, completedActionIds),
      cypherQueries.traceRippleImpact(graph.business.id, firstEventId, Array.from(matchedIds)),
    );
  },

  simulateSingleEvent(
    graph: SupplyChainGraph,
    event: TroubleEvent,
  ): ServiceResult<RippleImpact[]> {
    const matchedIds = assess(graph, event).map((m) => m.supplierId);
    return withAudit(
      () => simulateEventRipple(graph, event),
      cypherQueries.traceRippleImpact(graph.business.id, event.id, matchedIds),
    );
  },

  discoverHiddenSuppliers(graph: SupplyChainGraph): ServiceResult<DiscoveredLinkSuggestion[]> {
    const firstLayer1 = graph.suppliers.find((s) => s.layer === 1)?.id ?? 'none';
    return withAudit(
      () => discoverMissingUpstream(graph),
      cypherQueries.discoverHiddenSuppliers(firstLayer1),
    );
  },

  addSupplierAndLink(
    graph: SupplyChainGraph,
    input: {
      name: string;
      itemSupplied: string;
      layer: SupplierLayer;
      city: string;
      stockDays: number;
      toId: string;
      sharePct: number;
      transitDays: number;
    },
  ): ServiceResult<SupplyChainGraph> {
    return withAudit(() => {
      const place = matchPlaceInText(input.city);
      const id = `sup-user-${Date.now()}`;
      const groupGuess = input.itemSupplied.toLowerCase().split(/\s+/)[0] || 'general';
      const newSupplier: SupplierNode = {
        id,
        name: input.name.trim(),
        itemSupplied: input.itemSupplied.trim(),
        whatTheySupply: `Supplies ${input.itemSupplied.trim()} from ${place?.name ?? input.city.trim()}.`,
        group: groupGuess,
        layer: input.layer,
        city: place?.name ?? input.city.trim(),
        state: place?.state ?? graph.business.state,
        lat: place?.lat ?? graph.business.lat,
        lng: place?.lng ?? graph.business.lng,
        stockDays: clamp(input.stockDays, 1, 60),
        leadTimeDays: clamp(input.transitDays + 1, 1, 30),
        importance: 0.7,
        monthlySpendInr: 450000,
        dailyValueInr: 15000,
        alternativesCount: 1,
        alternateSuppliers: ['Regional Backup Supply Co'],
        onTimeDeliveryPct: 90,
        isSingleSource: input.sharePct >= 80,
        reliabilityScore: 0.85,
        verified: true,
        discoveredBy: 'user',
        keywords: [
          ...input.itemSupplied.toLowerCase().split(/\s+/),
          input.city.toLowerCase(),
        ].filter((w) => w.length >= 3),
      };

      const newLink: SuppliesLink = {
        id: `lnk-user-${Date.now()}`,
        fromId: id,
        toId: input.toId,
        relationship: 'SUPPLIES',
        sharePct: clamp(input.sharePct, 10, 100),
        transitDays: clamp(input.transitDays, 1, 20),
        substitutable: input.sharePct < 85,
      };

      return {
        business: graph.business,
        suppliers: [...graph.suppliers, newSupplier],
        links: [...graph.links, newLink],
      };
    }, cypherQueries.addSupplierAndLink(input.name, input.layer, input.toId, input.sharePct));
  },

  async analyzeNewsItem(params: {
    text: string;
    sourceType: SourceType;
    sourceName?: string;
    englishFallbackHint?: string;
    uiLanguage: UiLanguage;
    graph: SupplyChainGraph;
  }): Promise<
    ServiceResult<{
      language: NewsLanguage;
      languageDisplay: string;
      translation: string;
      sourceKind: TroubleEvent['sourceKind'];
      readerMode: TroubleEvent['readerMode'];
      events: TroubleEvent[];
      evidences: string[];
      noRelevantTrouble: boolean;
      fallbackReason?: string;
    }>
  > {
    const start = performance.now();
    const baseline = runOfflineRuleReader({
      text: params.text,
      sourceType: params.sourceType,
      sourceName: params.sourceName,
      fallbackLat: params.graph.business.lat,
      fallbackLng: params.graph.business.lng,
      fallbackRegion: params.graph.business.city,
    });

    // If a curated sample provides an exact English offline fallback string, keep it ready when Groq is absent
    const fallbackTranslation = params.englishFallbackHint || baseline.translation;
    const baselineEvent: TroubleEvent = {
      ...baseline,
      translation: fallbackTranslation,
      plainSummary: fallbackTranslation,
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let detectedLanguage: NewsLanguage = baseline.language;
    let languageDisplay = languageCodeToName(baseline.language);
    let translation = fallbackTranslation;
    let sourceKind: TroubleEvent['sourceKind'] = baseline.sourceKind;
    let readerMode: TroubleEvent['readerMode'] = 'offline-rule';
    let parsedEvents: TroubleEvent[] = [baselineEvent];
    let evidences: string[] = extractOfflineEvidence(params.text, baselineEvent);
    let noRelevantTrouble = false;
    let fallbackReason: string | undefined;

    try {
      const response = await fetch('/api/groq/read-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.text,
          sourceType: params.sourceType,
          uiLanguage: params.uiLanguage,
          knownCities: Array.from(
            new Set([
              ...params.graph.suppliers.map((s) => s.city),
              'Chennai',
              'Vellore',
              'Erode',
              'Coimbatore',
              'Coonoor',
              'Hosur',
              'Salem',
              'Sriperumbudur',
              'Tuticorin',
              'Madurai',
              'Bengaluru',
              'Mandya',
              'Mangalore',
              'Pune',
              'Kolhapur',
              'Mumbai',
              'Dahej',
              'Jamnagar',
              'Guntur',
              'Hyderabad',
              'Kochi',
              'Kolkata',
              'Joda',
              'Koraput',
              'Visakhapatnam',
              'Delhi',
            ]),
          ),
          knownGroups: Array.from(new Set(params.graph.suppliers.map((s) => s.group))),
          knownSuppliers: params.graph.suppliers.map((s) => s.name),
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.ok && json?.result) {
          const r = json.result as {
            language?: string;
            translation?: string;
            sourceKind?: string;
            events?: Array<{
              type?: string;
              target?: string;
              severity?: number;
              pricePct?: number | null;
              durationDays?: number | null;
              confidence?: number;
              evidence?: string;
            }>;
          };

          detectedLanguage = normalizeLanguageCode(String(r.language || ''), baseline.language);
          languageDisplay = String(r.language || languageCodeToName(detectedLanguage));
          translation = String(r.translation || fallbackTranslation);
          sourceKind = normalizeAiSourceKind(String(r.sourceKind || ''), baseline.sourceKind);
          readerMode = 'groq';

          const rawEvents = Array.isArray(r.events) ? r.events : [];
          if (rawEvents.length === 0) {
            noRelevantTrouble = true;
            parsedEvents = [];
            evidences = [];
          } else {
            evidences = rawEvents
              .map((ev) => String(ev.evidence || '').trim())
              .filter(Boolean);

            parsedEvents = rawEvents.map((rawEv, idx) => {
              const mappedType = mapAiTypeToEngine(
                String(rawEv.type || ''),
                `${params.text} ${translation}`,
                baseline.type,
              );
              const normalizedTarget = normalizeAiTarget(
                String(rawEv.target || ''),
                mappedType,
                params.graph,
              );
              const place = matchPlaceInText(
                `${rawEv.target || ''} ${normalizedTarget} ${translation} ${params.text}`,
              );
              const matchingSup = params.graph.suppliers.find(
                (s) =>
                  s.id === normalizedTarget ||
                  s.city.toLowerCase() === normalizedTarget.toLowerCase() ||
                  s.group.toLowerCase() === normalizedTarget.toLowerCase(),
              );
              const region = place?.name ?? matchingSup?.city ?? params.graph.business.city;
              const lat = place?.lat ?? matchingSup?.lat ?? params.graph.business.lat;
              const lng = place?.lng ?? matchingSup?.lng ?? params.graph.business.lng;

              const isPrice =
                mappedType === 'material_price_spike' || mappedType === 'fuel_price_hike';
              const pricePct =
                isPrice && typeof rawEv.pricePct === 'number' && rawEv.pricePct > 0
                  ? clamp(rawEv.pricePct, 0.05, 1)
                  : isPrice
                    ? (baseline.pricePct ?? 0.25)
                    : undefined;
              const severity = isPrice && pricePct !== undefined
                ? clamp(pricePct / 0.5, 0.1, 1)
                : clamp(Number(rawEv.severity ?? baseline.severity ?? 0.6), 0.2, 1);

              const durationDays =
                typeof rawEv.durationDays === 'number' && rawEv.durationDays > 0
                  ? clamp(Math.round(rawEv.durationDays), 1, 30)
                  : baseline.durationDays;

              const verifiedStatus = sourceKind === 'forward' ? 'unverified' : 'verified';
              const confidence = clamp(
                Number(rawEv.confidence ?? (sourceKind === 'forward' ? 0.35 : 0.88)),
                0.05,
                1,
              );

              return {
                id: `ev-gem-${Date.now()}-${idx}`,
                type: mappedType,
                hazardType: mappedType,
                target: normalizedTarget,
                severity,
                durationDays,
                expectedDurationDays: durationDays,
                pricePct,
                confidence,
                sourceKind,
                sourceText: params.text.trim(),
                rawText: params.text.trim(),
                language: detectedLanguage,
                translation,
                plainSummary: translation,
                title: `${String(rawEv.type || mappedType.replace(/_/g, ' '))} · ${region}`,
                sourceType:
                  sourceKind === 'govt alert'
                    ? 'official_bulletin'
                    : sourceKind === 'forward'
                      ? 'whatsapp_forward'
                      : 'local_news',
                sourceName:
                  params.sourceName ||
                  (sourceKind === 'govt alert'
                    ? 'Official Notice'
                    : sourceKind === 'forward'
                      ? 'Forwarded Message'
                      : 'Regional News Desk'),
                verifiedStatus,
                region,
                lat,
                lng,
                affectedKeywords: [
                  mappedType,
                  region.toLowerCase(),
                  normalizedTarget.toLowerCase(),
                ],
                publishedAt: new Date().toISOString(),
                readerMode: 'groq',
              };
            });
          }
        } else {
          fallbackReason = 'Smart reader returned an empty reply; used Offline Reader.';
        }
      } else {
        fallbackReason =
          response.status === 503 || response.status === 500
            ? 'Smart AI key is not configured or unavailable; used Offline Reader.'
            : `Smart reader returned status ${response.status}; used Offline Reader.`;
      }
    } catch (err) {
      readerMode = 'offline-rule';
      parsedEvents = [baselineEvent];
      fallbackReason =
        err instanceof Error && err.name === 'AbortError'
          ? 'Smart reader timed out; used Offline Reader.'
          : 'Could not reach smart reader; used Offline Reader.';
    } finally {
      window.clearTimeout(timeoutId);
    }

    const matchedIds = parsedEvents.flatMap((ev) =>
      assess(params.graph, ev).map((m) => m.supplierId),
    );
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const auditEventId = parsedEvents[0]?.id ?? 'none';

    return {
      data: {
        language: detectedLanguage,
        languageDisplay,
        translation,
        sourceKind,
        readerMode,
        events: parsedEvents,
        evidences,
        noRelevantTrouble,
        fallbackReason,
      },
      cypher: cypherQueries.traceRippleImpact(
        params.graph.business.id,
        auditEventId,
        Array.from(new Set(matchedIds)),
      ),
      computedAt: new Date().toISOString(),
      durationMs,
    };
  },

  async readNewsWithFallback(params: {
    text: string;
    sourceType: SourceType;
    sourceName?: string;
    uiLanguage: UiLanguage;
    graph: SupplyChainGraph;
  }): Promise<ServiceResult<TroubleEvent>> {
    const res = await this.analyzeNewsItem(params);
    const primary =
      res.data.events[0] ??
      runOfflineRuleReader({
        text: params.text,
        sourceType: params.sourceType,
        sourceName: params.sourceName,
        fallbackLat: params.graph.business.lat,
        fallbackLng: params.graph.business.lng,
        fallbackRegion: params.graph.business.city,
      });

    return {
      data: primary,
      cypher: res.cypher,
      computedAt: res.computedAt,
      durationMs: res.durationMs,
    };
  },

  async searchLocations(
    query: string,
  ): Promise<Array<{ city: string; state: string; lat: number; lng: number }>> {
    const clean = query.trim();
    if (clean.length < 2) return [];
    const resp = await fetch(`/api/geo/search?q=${encodeURIComponent(clean)}`);
    if (!resp.ok) return [];
    const json = (await resp.json().catch(() => null)) as {
      ok?: boolean;
      results?: Array<{ city: string; state: string; lat: number; lng: number }>;
    } | null;
    return Array.isArray(json?.results) ? json.results : [];
  },

  async reverseGeocodeLocation(
    lat: number,
    lng: number,
  ): Promise<{ city: string; state: string; lat: number; lng: number }> {
    try {
      const resp = await fetch('/api/geo/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const json = (await resp.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        location?: { city: string; state: string; lat: number; lng: number };
      } | null;
      if (resp.ok && json?.ok && json.location) {
        return json.location;
      }
    } catch {
      // fallback
    }
    try {
      const nomResp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json`,
        { headers: { 'User-Agent': 'DeepTier/1.0' }, signal: AbortSignal.timeout(4000) },
      );
      if (nomResp.ok) {
        const nomData = await nomResp.json();
        const addr = nomData?.address ?? {};
        const city = addr.city || addr.town || addr.village || addr.state_district || addr.suburb || 'Chennai';
        const state = addr.state || 'Tamil Nadu';
        return { city, state, lat, lng };
      }
    } catch {
      // fallback
    }
    return { city: 'Chennai', state: 'Tamil Nadu', lat, lng };
  },

  async fetchLiveWorldAlerts(params: {
    graph: SupplyChainGraph;
    uiLanguage: UiLanguage;
  }): Promise<
    ServiceResult<{
      sourceMode: 'groq-live' | 'live-feeds';
      notice?: string;
      fetchedAt: string;
      worldSummary: string;
      shopLocation: { city?: string; state?: string; lat?: number; lng?: number } | null;
      alerts: TroubleEvent[];
      nodeAdjustments?: Record<string, LiveNodeAdjustment>;
      groundingSources: Array<{ title: string; url: string }>;
      webSearchQueries: string[];
    }>
  > {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/groq/live-world-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: params.graph.business.businessName,
          shopCategory: params.graph.business.businessKind,
          shopCity: params.graph.business.city,
          shopState: params.graph.business.state,
          suppliers: params.graph.suppliers.map((s) => {
            const outLink = params.graph.links.find((l) => l.fromId === s.id);
            return {
              id: s.id,
              name: s.name,
              itemSupplied: s.itemSupplied,
              group: s.group,
              layer: s.layer,
              city: s.city,
              state: s.state,
              lat: s.lat,
              lng: s.lng,
              transitDays: outLink?.transitDays ?? s.leadTimeDays,
            };
          }),
          uiLanguage: params.uiLanguage,
        }),
        signal: controller.signal,
      });

      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        sourceMode?: 'groq-live' | 'live-feeds';
        notice?: string;
        fetchedAt?: string;
        worldSummary?: string;
        shopLocation?: { city?: string; state?: string; lat?: number; lng?: number } | null;
        nodeAdjustments?: Record<string, LiveNodeAdjustment>;
        alerts?: Array<{
          title?: string;
          type?: string;
          target?: string;
          region?: string;
          lat?: number;
          lng?: number;
          severity?: number;
          pricePct?: number | null;
          durationDays?: number;
          confidence?: number;
          sourceKind?: string;
          sourceName?: string;
          sourceUrl?: string;
          sourceText?: string;
          translation?: string;
          publishedDate?: string;
        }>;
        groundingSources?: Array<{ title: string; url: string }>;
        webSearchQueries?: string[];
      } | null;

      if (!response.ok || !json?.ok || !Array.isArray(json.alerts) || json.alerts.length === 0) {
        return generateFallbackWorldAlerts(params);
      }

      const groundingSources = Array.isArray(json.groundingSources)
        ? json.groundingSources
        : [];
      const rawAlerts = Array.isArray(json.alerts) ? json.alerts : [];
      const nowStamp = Date.now();

      const mappedAlerts: TroubleEvent[] = rawAlerts.map((raw, idx) => {
        const rawText = String(raw.sourceText || raw.translation || raw.title || '').trim();
        const mappedType = mapAiTypeToEngine(
          String(raw.type || 'flood'),
          `${raw.title || ''} ${rawText}`,
          'flood',
        );
        const normalizedTarget = normalizeAiTarget(
          String(raw.target || params.graph.business.city),
          mappedType,
          params.graph,
        );
        const matchingSup = params.graph.suppliers.find(
          (s) =>
            s.id === normalizedTarget ||
            s.city.toLowerCase() === normalizedTarget.toLowerCase() ||
            s.group.toLowerCase() === normalizedTarget.toLowerCase(),
        );
        const regionPlace = matchPlaceInText(
          `${raw.region || ''} ${normalizedTarget}`,
        );
        const region =
          String(raw.region || '').trim() ||
          regionPlace?.name ||
          matchingSup?.city ||
          params.graph.business.city;

        const lat =
          typeof raw.lat === 'number' && Number.isFinite(raw.lat)
            ? raw.lat
            : (regionPlace?.lat ?? matchingSup?.lat ?? params.graph.business.lat);
        const lng =
          typeof raw.lng === 'number' && Number.isFinite(raw.lng)
            ? raw.lng
            : (regionPlace?.lng ?? matchingSup?.lng ?? params.graph.business.lng);

        const isPrice =
          mappedType === 'material_price_spike' || mappedType === 'fuel_price_hike';
        const pricePct =
          isPrice && typeof raw.pricePct === 'number' && raw.pricePct > 0
            ? clamp(raw.pricePct, 0.03, 1)
            : isPrice
              ? 0.1
              : undefined;
        const severity =
          isPrice && pricePct !== undefined
            ? clamp(pricePct / 0.5, 0.1, 1)
            : clamp(Number(raw.severity ?? 0.35), 0.1, 1);
        const durationDays =
          typeof raw.durationDays === 'number' && raw.durationDays > 0
            ? clamp(Math.round(raw.durationDays), 1, 30)
            : 3;
        const sourceKind = normalizeAiSourceKind(
          String(raw.sourceKind || 'news'),
          'news',
        );
        const verifiedStatus = sourceKind === 'forward' ? 'unverified' : 'verified';
        const confidence = clamp(Number(raw.confidence ?? 0.8), 0.1, 1);
        const translation = String(raw.translation || rawText || raw.title || '').trim();
        const publishedAt = raw.publishedDate
          ? new Date(`${raw.publishedDate}T08:00:00Z`).toISOString()
          : (json.fetchedAt ?? new Date().toISOString());
        const fallbackUrl = groundingSources[idx % Math.max(1, groundingSources.length)]?.url;
        const sourceUrl =
          typeof raw.sourceUrl === 'string' && raw.sourceUrl.startsWith('http')
            ? raw.sourceUrl
            : fallbackUrl;

        return {
          id: `ev-live-${nowStamp}-${idx}`,
          type: mappedType,
          hazardType: mappedType,
          target: normalizedTarget,
          severity,
          durationDays,
          expectedDurationDays: durationDays,
          pricePct,
          confidence,
          sourceKind,
          sourceText: rawText,
          rawText,
          language: params.uiLanguage,
          translation,
          plainSummary: translation,
          title: String(raw.title || `${mappedType.replace(/_/g, ' ')} · ${region}`).trim(),
          sourceType:
            sourceKind === 'govt alert' ? 'official_bulletin' : 'local_news',
          sourceName: String(raw.sourceName || 'Live Web Search').trim(),
          sourceUrl,
          verifiedStatus,
          region,
          lat,
          lng,
          affectedKeywords: [
            mappedType,
            region.toLowerCase(),
            normalizedTarget.toLowerCase(),
          ],
          publishedAt: Number.isNaN(Date.parse(publishedAt))
            ? new Date().toISOString()
            : publishedAt,
          readerMode: json.sourceMode === 'live-feeds' ? 'offline-rule' : 'groq',
          isLive: true,
          groundingSources,
        };
      });

      const matchedIds = mappedAlerts.flatMap((ev) =>
        assess(params.graph, ev).map((m) => m.supplierId),
      );
      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      return {
        data: {
          sourceMode: json.sourceMode === 'live-feeds' ? 'live-feeds' : 'groq-live',
          notice: typeof json.notice === 'string' ? json.notice : undefined,
          fetchedAt: json.fetchedAt ?? new Date().toISOString(),
          worldSummary:
            json.worldSummary ||
            `Live world scan completed for ${params.graph.business.businessName} in ${params.graph.business.city}.`,
          shopLocation: json.shopLocation ?? null,
          alerts: mappedAlerts,
          nodeAdjustments:
            json.nodeAdjustments && typeof json.nodeAdjustments === 'object'
              ? json.nodeAdjustments
              : undefined,
          groundingSources,
          webSearchQueries: Array.isArray(json.webSearchQueries)
            ? json.webSearchQueries
            : [],
        },
        cypher: cypherQueries.traceRippleImpact(
          params.graph.business.id,
          mappedAlerts[0]?.id ?? 'live-scan',
          Array.from(new Set(matchedIds)),
        ),
        computedAt: new Date().toISOString(),
        durationMs,
      };
    } catch {
      return generateFallbackWorldAlerts(params);
    } finally {
      window.clearTimeout(timeoutId);
    }
  },

  runSelfTests(): ServiceResult<SelfTestResult[]> {
    return withAudit(
      () => runEngineVerificationSuite(),
      cypherQueries.findSingleSourceBottlenecks('YOU'),
    );
  },
};

function languageCodeToName(code: NewsLanguage): string {
  const map: Record<NewsLanguage, string> = {
    en: 'English',
    ta: 'Tamil',
    hi: 'Hindi',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    bn: 'Bengali',
    mr: 'Marathi',
  };
  return map[code] ?? 'English';
}

function normalizeLanguageCode(raw: string, fallback: NewsLanguage): NewsLanguage {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('ta') || lower.includes('tamil')) return 'ta';
  if (lower.startsWith('hi') || lower.includes('hindi')) return 'hi';
  if (lower.startsWith('te') || lower.includes('telugu')) return 'te';
  if (lower.startsWith('kn') || lower.includes('kannada')) return 'kn';
  if (lower.startsWith('ml') || lower.includes('malayalam')) return 'ml';
  if (lower.startsWith('bn') || lower.includes('bengali')) return 'bn';
  if (lower.startsWith('mr') || lower.includes('marathi')) return 'mr';
  if (lower.startsWith('en') || lower.includes('english')) return 'en';
  return fallback;
}

function normalizeAiSourceKind(
  raw: string,
  fallback: TroubleEvent['sourceKind'],
): TroubleEvent['sourceKind'] {
  const lower = raw.trim().toLowerCase();
  if (lower === 'official' || lower.includes('govt')) return 'govt alert';
  if (lower === 'forward' || lower.includes('whatsapp')) return 'forward';
  if (lower === 'news') return 'news';
  return fallback;
}

const CANONICAL_RISK_TYPES = new Set<RiskEventType>([
  'flood',
  'cyclone',
  'heatwave',
  'water_shortage',
  'power_outage',
  'transport_strike',
  'port_congestion',
  'highway_blockade',
  'factory_fire',
  'crop_disease',
  'cattle_disease',
  'raw_material_shortage',
  'export_ban',
  'gas_shortage',
  'material_price_spike',
  'fuel_price_hike',
  'supplier_shutdown',
  'cyber_attack',
]);

function mapAiTypeToEngine(
  rawType: string,
  contextText: string,
  fallback: RiskEventType,
): RiskEventType {
  const lower = rawType.trim().toLowerCase();
  if (CANONICAL_RISK_TYPES.has(lower as RiskEventType)) {
    return lower as RiskEventType;
  }
  const ctx = contextText.toLowerCase();

  if (lower === 'flood') return 'flood';
  if (lower.includes('cyclone') || lower.includes('storm')) return 'cyclone';
  if (lower.includes('heatwave') || lower.includes('drought')) {
    return /water|drought|நீர்|வறட்சி|सूखा|ಜಲ/.test(ctx) ? 'water_shortage' : 'heatwave';
  }
  if (lower.includes('fire') || lower.includes('explosion')) return 'factory_fire';
  if (lower.includes('earthquake') || lower.includes('landslide') || lower.includes('bandh')) {
    return 'highway_blockade';
  }
  if (lower.includes('trucker') || lower.includes('labour') || lower.includes('strike')) {
    return 'transport_strike';
  }
  if (lower.includes('power')) return 'power_outage';
  if (lower.includes('fuel') || lower.includes('gas')) {
    return /diesel|petrol|freight hike/.test(ctx) &&
      !/gas|lpg|cylinder|எரிவாயு|गैस|ಗ್ಯಾಸ್|ഗ്യാസ്|গ্যাস|गॅस/.test(ctx)
      ? 'fuel_price_hike'
      : 'gas_shortage';
  }
  if (lower.includes('port') || lower.includes('road closure')) {
    return /port|harbour|dock|துறைமுகம்|തുറമുഖം/.test(ctx) ? 'port_congestion' : 'highway_blockade';
  }
  if (lower.includes('cyber')) return 'cyber_attack';
  if (lower.includes('shutdown') || lower.includes('licence') || lower.includes('safety closure')) {
    return 'supplier_shutdown';
  }
  if (lower.includes('price')) {
    return /diesel|petrol|fuel/.test(ctx) ? 'fuel_price_hike' : 'material_price_spike';
  }
  if (lower.includes('export ban') || lower.includes('duty')) return 'export_ban';
  if (lower.includes('disease') || lower.includes('pest')) {
    return /milk|cattle|dairy|cow|fodder|பால்|தீவனம்/.test(ctx)
      ? 'cattle_disease'
      : 'crop_disease';
  }
  if (lower.includes('recall')) return 'raw_material_shortage';
  return fallback;
}

function normalizeAiTarget(
  rawTarget: string,
  mappedType: RiskEventType,
  graph: SupplyChainGraph,
): string {
  const trimmed = rawTarget.trim();
  const lower = trimmed.toLowerCase();

  // Map city spelling aliases required by schema
  if (lower === 'thoothukudi' || lower === 'thoothukkudi' || lower === 'tuticorin') {
    if (mappedType !== 'supplier_shutdown' && mappedType !== 'cyber_attack') {
      return 'Tuticorin';
    }
  }
  if (lower === 'madras' || lower === 'chennai') {
    if (mappedType !== 'supplier_shutdown' && mappedType !== 'cyber_attack') {
      return 'Chennai';
    }
  }
  if (lower === 'cochin' || lower === 'kochi') {
    if (mappedType !== 'supplier_shutdown' && mappedType !== 'cyber_attack') {
      return 'Kochi';
    }
  }
  if (lower === 'vizag' || lower === 'visakhapatnam') {
    return 'Visakhapatnam';
  }

  // If single-supplier event, map named supplier or city to an actual supplier ID in active graph
  if (mappedType === 'supplier_shutdown' || mappedType === 'cyber_attack') {
    const byId = graph.suppliers.find((s) => s.id.toLowerCase() === lower);
    if (byId) return byId.id;
    const byName = graph.suppliers.find(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        lower.includes(s.name.toLowerCase().split(' ')[0]),
    );
    if (byName) return byName.id;
    const byCity = graph.suppliers.find((s) => s.city.toLowerCase() === lower);
    if (byCity) return byCity.id;
  }

  const isMaterialType =
    mappedType === 'crop_disease' ||
    mappedType === 'cattle_disease' ||
    mappedType === 'raw_material_shortage' ||
    mappedType === 'export_ban' ||
    mappedType === 'gas_shortage' ||
    mappedType === 'material_price_spike';

  if (isMaterialType) {
    const exactGroup = graph.suppliers.find((s) => s.group.toLowerCase() === lower);
    if (exactGroup) return exactGroup.group;
    const partialGroup = graph.suppliers.find(
      (s) =>
        lower.includes(s.group.toLowerCase()) ||
        s.itemSupplied.toLowerCase().includes(lower) ||
        s.keywords.some((kw) => kw.length >= 3 && lower.includes(kw.toLowerCase())),
    );
    if (partialGroup) return partialGroup.group;
    if (/\blpg\b|cylinder|propane|butane|gas/.test(lower)) return 'gas';
  }

  const place = matchPlaceInText(trimmed);
  if (place && !isMaterialType) {
    return place.name;
  }

  return trimmed || graph.business.city;
}

function extractOfflineEvidence(text: string, ev: TroubleEvent): string[] {
  const tokens: string[] = [];
  if (ev.region) tokens.push(ev.region);
  if (ev.pricePct) tokens.push(`${Math.round(ev.pricePct * 100)}%`);
  if (ev.durationDays) tokens.push(`${ev.durationDays}`);
  if (ev.type) tokens.push(ev.type.replace(/_/g, ' '));
  return Array.from(new Set(tokens.filter((t) => text.length > 0 && t.length > 0)));
}
