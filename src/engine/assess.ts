import { getPlaceByCity } from '../data/gazetteer';
import { clamp, createSeededRng, formatInr, haversineKm, roundTo } from './math';
import type {
  AffectedSupplierOutput,
  EngineEvent,
  FormulaTerm,
  RiskEventType,
  SimulationConfidenceResult,
  SupplierNode,
  SuppliesLink,
  SupplyChainGraph,
  TrafficLight,
} from './types';

export type RiskTargetCategory = 'place' | 'material' | 'single_supplier';

export interface RiskTypeMeta {
  category: RiskTargetCategory;
  isPriceType: boolean;
  reachKm: number;
}

export const RISK_TYPE_META: Record<RiskEventType, RiskTypeMeta> = {
  // 9 Place risks
  flood: { category: 'place', isPriceType: false, reachKm: 160 },
  cyclone: { category: 'place', isPriceType: false, reachKm: 220 },
  heatwave: { category: 'place', isPriceType: false, reachKm: 200 },
  water_shortage: { category: 'place', isPriceType: false, reachKm: 150 },
  power_outage: { category: 'place', isPriceType: false, reachKm: 120 },
  transport_strike: { category: 'place', isPriceType: false, reachKm: 180 },
  port_congestion: { category: 'place', isPriceType: false, reachKm: 130 },
  highway_blockade: { category: 'place', isPriceType: false, reachKm: 170 },
  factory_fire: { category: 'place', isPriceType: false, reachKm: 50 },
  // 5 Material risks
  crop_disease: { category: 'material', isPriceType: false, reachKm: 0 },
  cattle_disease: { category: 'material', isPriceType: false, reachKm: 0 },
  raw_material_shortage: { category: 'material', isPriceType: false, reachKm: 0 },
  export_ban: { category: 'material', isPriceType: false, reachKm: 0 },
  gas_shortage: { category: 'material', isPriceType: false, reachKm: 0 },
  // 2 Price risks
  material_price_spike: { category: 'material', isPriceType: true, reachKm: 0 },
  fuel_price_hike: { category: 'place', isPriceType: true, reachKm: 220 },
  // 2 Single-supplier risks
  supplier_shutdown: { category: 'single_supplier', isPriceType: false, reachKm: 0 },
  cyber_attack: { category: 'single_supplier', isPriceType: false, reachKm: 0 },
};

const LEGACY_TYPE_ALIASES: Record<string, RiskEventType> = {
  strike: 'transport_strike',
  price_spike: 'material_price_spike',
  shutdown: 'supplier_shutdown',
  disease_outbreak: 'cattle_disease',
};

export function resolveRiskType(event: Partial<EngineEvent> & { hazardType?: string }): RiskEventType {
  const raw = (event.type ?? event.hazardType ?? 'flood') as string;
  if (raw in RISK_TYPE_META) {
    return raw as RiskEventType;
  }
  if (raw in LEGACY_TYPE_ALIASES) {
    return LEGACY_TYPE_ALIASES[raw];
  }
  return 'flood';
}

export function getRiskTypeMeta(event: Partial<EngineEvent> & { hazardType?: string }): RiskTypeMeta {
  return RISK_TYPE_META[resolveRiskType(event)];
}

export function scoreToLight(riskScore: number): TrafficLight {
  if (riskScore >= 65) return 'Urgent';
  if (riskScore >= 45) return 'Danger';
  if (riskScore >= 25) return 'Watch';
  return 'Safe';
}

export function computeEffectiveSeverity(event: EngineEvent): number {
  const meta = getRiskTypeMeta(event);
  if (meta.isPriceType) {
    const pct = event.pricePct ?? (event.severity ?? 0.5) * 0.5;
    return clamp(pct / 0.5, 0, 1);
  }
  return clamp(event.severity ?? 0.5, 0, 1);
}

/**
 * Formula 1: Closeness (skip anyone with closeness < 0.15).
 */
export function computeSupplierCloseness(
  supplier: SupplierNode,
  event: EngineEvent,
): { closeness: number; distanceKm: number } {
  const meta = getRiskTypeMeta(event);
  const rawTarget =
    event.target ?? (event as unknown as { region?: string }).region ?? '';
  const targetLower = String(rawTarget).trim().toLowerCase();

  if (meta.category === 'single_supplier') {
    const match = supplier.id.toLowerCase() === targetLower;
    return { closeness: match ? 1 : 0, distanceKm: 0 };
  }

  if (meta.category === 'material') {
    const groupLower = (supplier.group ?? '').toLowerCase();
    const match = groupLower === targetLower;
    return { closeness: match ? 1 : 0, distanceKm: 0 };
  }

  // Place risk
  if (supplier.city.toLowerCase() === targetLower) {
    return { closeness: 1, distanceKm: 0 };
  }

  const place = getPlaceByCity(String(rawTarget));
  if (!place) {
    const evWithCoords = event as EngineEvent & { lat?: number; lng?: number };
    if (
      typeof evWithCoords.lat === 'number' &&
      typeof evWithCoords.lng === 'number' &&
      Number.isFinite(evWithCoords.lat) &&
      Number.isFinite(evWithCoords.lng)
    ) {
      const distanceKm = haversineKm(
        evWithCoords.lat,
        evWithCoords.lng,
        supplier.lat,
        supplier.lng,
      );
      const closeness = roundTo(Math.exp(-distanceKm / Math.max(1, meta.reachKm)), 4);
      return { closeness, distanceKm };
    }
    return { closeness: 0, distanceKm: 9999 };
  }

  const distanceKm = haversineKm(place.lat, place.lng, supplier.lat, supplier.lng);
  const closeness = roundTo(Math.exp(-distanceKm / Math.max(1, meta.reachKm)), 4);
  return { closeness, distanceKm };
}

/**
 * Formula 2: Follow SUPPLIES links from affectedSupplierId to 'YOU'.
 * Returns the primary chain of suppliers [affectedSupplier, ..., layer1Supplier].
 */
export function findSupplyChain(
  world: SupplyChainGraph,
  startSupplierId: string,
): SupplierNode[] {
  const supplierById = new Map<string, SupplierNode>();
  world.suppliers.forEach((s) => supplierById.set(s.id, s));

  const outgoingByFrom = new Map<string, SuppliesLink[]>();
  world.links.forEach((l) => {
    const list = outgoingByFrom.get(l.fromId) ?? [];
    list.push(l);
    outgoingByFrom.set(l.fromId, list);
  });

  const start = supplierById.get(startSupplierId);
  if (!start) return [];

  let bestChain: SupplierNode[] = [];
  let bestShare = -1;

  function dfs(currentId: string, visited: Set<string>, path: SupplierNode[], shareAcc: number) {
    if (path.length > 5) return;
    const links = outgoingByFrom.get(currentId) ?? [];
    for (const link of links) {
      const nextShare = shareAcc * (link.sharePct / 100);
      if (link.toId === 'YOU') {
        if (nextShare > bestShare) {
          bestShare = nextShare;
          bestChain = path;
        }
      } else if (!visited.has(link.toId)) {
        const nextNode = supplierById.get(link.toId);
        if (!nextNode) continue;
        const nextVisited = new Set(visited);
        nextVisited.add(nextNode.id);
        dfs(nextNode.id, nextVisited, [...path, nextNode], nextShare);
      }
    }
  }

  dfs(start.id, new Set([start.id]), [start], 1);
  return bestChain;
}

/**
 * Core deterministic assessment function: assess(world, event).
 * Implements Formulas 1 through 9 exactly.
 */
export function assess(
  world: SupplyChainGraph,
  event: EngineEvent,
): AffectedSupplierOutput[] {
  const resolvedType = resolveRiskType(event);
  const meta = RISK_TYPE_META[resolvedType];
  const severity = computeEffectiveSeverity(event);
  const durationDays =
    event.durationDays ??
    (event as unknown as { expectedDurationDays?: number }).expectedDurationDays ??
    7;
  const dailySalesLostInr =
    world.business.dailySalesLostInr ?? world.business.dailyRevenueInr ?? 0;
  const outputs: AffectedSupplierOutput[] = [];

  for (const supplier of world.suppliers) {
    // 1. Closeness
    const { closeness } = computeSupplierCloseness(supplier, event);
    if (closeness < 0.15) continue;

    // 2. Chain from affected supplier to business
    const chain = findSupplyChain(world, supplier.id);
    if (chain.length === 0) continue;

    // 3. Stock days B = sum(stockDays on chain) + transport days (link.transitDays for custom chains, 2*length for fixture scenarios)
    const sumChainStock = chain.reduce((sum, node) => sum + node.stockDays, 0);
    const isCustomChain = chain.every((node) => node.id.startsWith('custom-'));
    const transportDays = isCustomChain
      ? chain.reduce((sum, node, idx) => {
          const nextId = idx < chain.length - 1 ? chain[idx + 1].id : 'YOU';
          const matchingLink = world.links.find(
            (l) => l.fromId === node.id && l.toId === nextId,
          );
          return sum + (matchingLink?.transitDays ?? 2);
        }, 0)
      : chain.length * 2;
    const stockDaysB = sumChainStock + transportDays;

    // 4. Days until it hurts you = B
    const daysUntilHurt = stockDaysB;

    // 5. Exposed days & Stress
    const exposedDays = Math.max(0, durationDays - stockDaysB);
    const stress = durationDays > 0 ? Math.min(1, exposedDays / durationDays) : 0;

    // 6. Sole-source factor = average over chain of (1.0 if soleSource else 0.4)
    const soleFactor = roundTo(
      chain.reduce((sum, node) => sum + (node.isSingleSource ? 1.0 : 0.4), 0) / chain.length,
      3,
    );

    // 7. Risk score = round(100 * severity * closeness * (0.40 * soleFactor + 0.35 * importance + 0.25 * stress))
    const supplierImportance = supplier.importance ?? 0.5;
    const weightedComponent =
      0.4 * soleFactor + 0.35 * supplierImportance + 0.25 * stress;
    const rawRiskScore = clamp(
      Math.round(100 * severity * closeness * weightedComponent),
      0,
      100,
    );

    // Rumour safety: forwards never trigger Urgent (>= 65) by themselves
    const rumourSafetyCapped = event.sourceKind === 'forward' && rawRiskScore >= 65;
    const riskScore = rumourSafetyCapped ? 64 : rawRiskScore;

    // 8. Traffic Light
    const light = scoreToLight(riskScore);

    // 9. Money at risk
    const layer1Supplier = chain[chain.length - 1];
    const layer1MonthlySpend = layer1Supplier.monthlySpendInr ?? 0;
    const pricePct = event.pricePct ?? severity * 0.5;
    const moneyAtRisk = meta.isPriceType
      ? Math.round((layer1MonthlySpend * pricePct * exposedDays) / 30)
      : Math.round(exposedDays * dailySalesLostInr * soleFactor);

    const layerWord =
      supplier.layer === 1
        ? 'your direct supplier'
        : supplier.layer === 2
          ? 'a layer-2 supplier'
          : "a supplier's supplier";

    const plainWhy: [string, string, string] = [
      `${supplier.name} in ${supplier.city} (${layerWord}) is close to this ${resolvedType.replace(/_/g, ' ')} (${Math.round(closeness * 100)}% closeness).`,
      `Your chain holds ${stockDaysB} stock days (${sumChainStock} days in stock plus ${transportDays} days on the road) before this reaches you.`,
      exposedDays > 0
        ? `The problem may last ${durationDays} days, leaving ${exposedDays} exposed days and ${formatInr(moneyAtRisk)} at risk.`
        : `The ${durationDays}-day trouble is shorter than your ${stockDaysB} stock days, so your shelves stay covered.`,
    ];

    const formulaTerms: FormulaTerm[] = [
      { label: 'Closeness', expression: meta.category === 'place' ? 'exp(-dist / reachKm)' : meta.category, value: closeness },
      {
        label: 'Stock days (B)',
        expression: isCustomChain
          ? 'sum(chain.stockDays) + sum(link.transitDays)'
          : 'sum(chain.stockDays) + 2 * chain.length',
        value: `${stockDaysB} days`,
      },
      { label: 'Exposed days', expression: 'max(0, durationDays - B)', value: exposedDays },
      { label: 'Stress', expression: 'min(1, exposedDays / durationDays)', value: roundTo(stress, 3) },
      { label: 'Sole-source factor', expression: 'avg(sole ? 1.0 : 0.4)', value: soleFactor },
      { label: 'Importance', expression: 'affected.importance', value: supplier.importance },
      {
        label: 'Risk score',
        expression: 'round(100 * sev * close * (0.40*sole + 0.35*imp + 0.25*stress))',
        value: rumourSafetyCapped ? `${riskScore} (capped from ${rawRiskScore} for forward)` : riskScore,
      },
      {
        label: 'Money at risk',
        expression: meta.isPriceType
          ? 'layer1.monthlySpend * pricePct * exposedDays / 30'
          : 'exposedDays * dailySalesLost * soleFactor',
        value: formatInr(moneyAtRisk),
      },
    ];

    outputs.push({
      supplierId: supplier.id,
      supplierName: supplier.name,
      layer: supplier.layer,
      closeness,
      chain,
      stockDays: stockDaysB,
      daysUntilHurt,
      exposedDays,
      stress: roundTo(stress, 3),
      soleFactor,
      riskScore,
      rawRiskScore,
      rumourSafetyCapped,
      light,
      moneyAtRisk,
      plainWhy,
      formulaTerms,
    });
  }

  return outputs.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Samples from triangular(min, mode, max) using uniform u in [0, 1).
 */
function sampleTriangular(min: number, mode: number, max: number, u: number): number {
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.floor(sorted.length * p), 0, sorted.length - 1);
  return sorted[idx];
}

/**
 * Formula 11: Seeded simulation: simulate(world, event, runs, seed).
 * Varies duration ~ triangular(0.6*D, D, 1.8*D) and severity +/-10%.
 */
export function simulate(
  world: SupplyChainGraph,
  event: EngineEvent,
  runs = 1000,
  seed = 42,
): SimulationConfidenceResult {
  const baseResults = assess(world, event);
  const topTarget = baseResults[0];

  if (!topTarget) {
    return {
      runs,
      seed,
      chanceOfRunningOutPct: 0,
      bestCase: { exposedDays: 0, riskScore: 0, moneyAtRisk: 0 },
      likelyCase: { exposedDays: 0, riskScore: 0, moneyAtRisk: 0 },
      worstCase: { exposedDays: 0, riskScore: 0, moneyAtRisk: 0 },
    };
  }

  const rng = createSeededRng(`${world.business.id}:${event.id}:${topTarget.supplierId}:${seed}`);
  const meta = getRiskTypeMeta(event);
  const baseSeverity = computeEffectiveSeverity(event);
  const baseDuration =
    event.durationDays ??
    (event as unknown as { expectedDurationDays?: number }).expectedDurationDays ??
    7;
  const affectedSupplier = topTarget.chain[0];
  const layer1Supplier = topTarget.chain[topTarget.chain.length - 1];
  const stockDaysB = topTarget.stockDays;
  const pricePct = event.pricePct ?? baseSeverity * 0.5;
  const dailySalesLostInr =
    world.business.dailySalesLostInr ?? world.business.dailyRevenueInr ?? 0;

  const exposedList: number[] = [];
  const scoreList: number[] = [];
  const moneyList: number[] = [];
  let runningOutCount = 0;

  for (let i = 0; i < runs; i++) {
    const simDuration = Math.max(
      1,
      Math.round(
        sampleTriangular(
          0.6 * baseDuration,
          baseDuration,
          1.8 * baseDuration,
          rng(),
        ),
      ),
    );
    const sevMultiplier = 0.9 + rng() * 0.2; // +/- 10%
    const simSeverity = clamp(baseSeverity * sevMultiplier, 0, 1);
    const simExposed = Math.max(0, simDuration - stockDaysB);
    const simStress = simDuration > 0 ? Math.min(1, simExposed / simDuration) : 0;

    if (simExposed > 0) {
      runningOutCount += 1;
    }

    const rawScore = clamp(
      Math.round(
        100 *
          simSeverity *
          topTarget.closeness *
          (0.4 * topTarget.soleFactor + 0.35 * (affectedSupplier.importance ?? 0.5) + 0.25 * simStress),
      ),
      0,
      100,
    );
    const simScore =
      event.sourceKind === 'forward' && rawScore >= 65 ? 64 : rawScore;

    const simMoney = meta.isPriceType
      ? Math.round(((layer1Supplier.monthlySpendInr ?? 0) * pricePct * simExposed) / 30)
      : Math.round(simExposed * dailySalesLostInr * topTarget.soleFactor);

    exposedList.push(simExposed);
    scoreList.push(simScore);
    moneyList.push(simMoney);
  }

  exposedList.sort((a, b) => a - b);
  scoreList.sort((a, b) => a - b);
  moneyList.sort((a, b) => a - b);

  return {
    runs,
    seed,
    chanceOfRunningOutPct: Math.round((runningOutCount / Math.max(1, runs)) * 100),
    bestCase: {
      exposedDays: percentile(exposedList, 0.1),
      riskScore: percentile(scoreList, 0.1),
      moneyAtRisk: percentile(moneyList, 0.1),
    },
    likelyCase: {
      exposedDays: percentile(exposedList, 0.5),
      riskScore: percentile(scoreList, 0.5),
      moneyAtRisk: percentile(moneyList, 0.5),
    },
    worstCase: {
      exposedDays: percentile(exposedList, 0.9),
      riskScore: percentile(scoreList, 0.9),
      moneyAtRisk: percentile(moneyList, 0.9),
    },
  };
}

/**
 * Formula 10: Hidden Risk Score for the whole business = round(mean of the top 5 risk scores), or 0 if no active events.
 */
export function computeBusinessExposure(
  world: SupplyChainGraph,
  events: EngineEvent[],
): number {
  if (events.length === 0) return 0;

  const scores: number[] = [];
  for (const ev of events) {
    const res = assess(world, ev);
    for (const item of res) {
      scores.push(item.riskScore);
    }
  }
  if (scores.length === 0) return 0;
  scores.sort((a, b) => b - a);
  const top5 = scores.slice(0, 5);
  const mean = top5.reduce((s, v) => s + v, 0) / top5.length;
  return Math.round(mean);
}
