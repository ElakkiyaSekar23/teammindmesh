import { getPlaceByCity } from './gazetteer';
import type {
  PersonaType,
  RiskEventType,
  SupplyChainGraph,
  TroubleEvent,
} from '../engine/types';
import { RISK_TYPE_META, type RiskTargetCategory } from '../engine/assess';

export type RiskFamilyId =
  | 'nature'
  | 'accidents'
  | 'people'
  | 'infrastructure'
  | 'technology'
  | 'business'
  | 'market_rules'
  | 'health';

export interface RiskFamilyMeta {
  id: RiskFamilyId;
  label: string;
  subtitle: string;
}

export const RISK_FAMILIES: RiskFamilyMeta[] = [
  {
    id: 'nature',
    label: 'Nature',
    subtitle: 'Rain, storms, heatwaves, and dry wells',
  },
  {
    id: 'accidents',
    label: 'Accidents',
    subtitle: 'Fires and sudden plant mishaps',
  },
  {
    id: 'people',
    label: 'People',
    subtitle: 'Driver strikes and walkouts',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    subtitle: 'Power cuts, blocked roads, and busy ports',
  },
  {
    id: 'technology',
    label: 'Technology',
    subtitle: 'Locked computers and billing outages',
  },
  {
    id: 'business',
    label: 'Business',
    subtitle: 'Vendor closures and missing raw stock',
  },
  {
    id: 'market_rules',
    label: 'Market & Rules',
    subtitle: 'Sudden price jumps and government export bans',
  },
  {
    id: 'health',
    label: 'Health',
    subtitle: 'Crop and cattle diseases on farms',
  },
];

export type VisibilityKind = 'Usually hidden' | 'Visible locally';

export interface RiskLibraryItem {
  type: RiskEventType;
  family: RiskFamilyId;
  plainTitle: string;
  everydayExample: string;
  visibilityTag: VisibilityKind;
  visibilityHint: string;
  targetCategory: RiskTargetCategory;
  isPriceType: boolean;
}

export const RISK_LIBRARY_ITEMS: RiskLibraryItem[] = [
  // 1. Nature (4)
  {
    type: 'flood',
    family: 'nature',
    plainTitle: 'Flooding',
    everydayExample: 'Flood: heavy rain swamps roads and godowns so trucks cannot leave',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Seen in local news, or hits an upstream town',
    targetCategory: RISK_TYPE_META.flood.category,
    isPriceType: RISK_TYPE_META.flood.isPriceType,
  },
  {
    type: 'cyclone',
    family: 'nature',
    plainTitle: 'Cyclone storm',
    everydayExample: 'Cyclone: coastal winds shut highways, markets, and power lines for days',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Coastal weather alerts warn a day or two ahead',
    targetCategory: RISK_TYPE_META.cyclone.category,
    isPriceType: RISK_TYPE_META.cyclone.isPriceType,
  },
  {
    type: 'heatwave',
    family: 'nature',
    plainTitle: 'Severe heatwave',
    everydayExample: 'Heatwave: extreme afternoon heat cuts milk yield and wilts farm greens',
    visibilityTag: 'Visible locally',
    visibilityHint: 'You feel the heat, yet farm shortages show days later',
    targetCategory: RISK_TYPE_META.heatwave.category,
    isPriceType: RISK_TYPE_META.heatwave.isPriceType,
  },
  {
    type: 'water_shortage',
    family: 'nature',
    plainTitle: 'Water shortage',
    everydayExample: 'Water dries up: boiling, dyeing, and chilling plants cut output by half',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Often hits farms and inland plants far from your street',
    targetCategory: RISK_TYPE_META.water_shortage.category,
    isPriceType: RISK_TYPE_META.water_shortage.isPriceType,
  },

  // 2. Accidents (1)
  {
    type: 'factory_fire',
    family: 'accidents',
    plainTitle: 'Factory fire',
    everydayExample: 'Plant fire: a fire at a workshop stops deliveries for weeks while repairs happen',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Happens inside a supplier or sub-supplier compound',
    targetCategory: RISK_TYPE_META.factory_fire.category,
    isPriceType: RISK_TYPE_META.factory_fire.isPriceType,
  },

  // 3. People (1)
  {
    type: 'transport_strike',
    family: 'people',
    plainTitle: 'Truckers strike',
    everydayExample: 'Truckers strike: goods stop moving between cities',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Highways go quiet and mandi arrivals drop fast',
    targetCategory: RISK_TYPE_META.transport_strike.category,
    isPriceType: RISK_TYPE_META.transport_strike.isPriceType,
  },

  // 4. Infrastructure (3)
  {
    type: 'power_outage',
    family: 'infrastructure',
    plainTitle: 'Power outage',
    everydayExample: 'Power cut: cold rooms warm up and CNC workshops sit idle without electricity',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Noticeable locally, or quietly stalls a foundry in another city',
    targetCategory: RISK_TYPE_META.power_outage.category,
    isPriceType: RISK_TYPE_META.power_outage.isPriceType,
  },
  {
    type: 'port_congestion',
    family: 'infrastructure',
    plainTitle: 'Port jam',
    everydayExample: 'Port delay: ships wait offshore so imported gas, pulp, or oil arrives late',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Hidden at sea ports two or three steps behind your vendor',
    targetCategory: RISK_TYPE_META.port_congestion.category,
    isPriceType: RISK_TYPE_META.port_congestion.isPriceType,
  },
  {
    type: 'highway_blockade',
    family: 'infrastructure',
    plainTitle: 'Road blockade',
    everydayExample: 'Highway blocked: landslides or bridge repairs trap loaded delivery trucks',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Shows up in traffic news along inter-state routes',
    targetCategory: RISK_TYPE_META.highway_blockade.category,
    isPriceType: RISK_TYPE_META.highway_blockade.isPriceType,
  },

  // 5. Technology (1)
  {
    type: 'cyber_attack',
    family: 'technology',
    plainTitle: 'Cyber attack',
    everydayExample:
      "Cyber attack: a supplier's computers are locked and they cannot take orders",
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Unseen until dispatch slips fail to print or invoices freeze',
    targetCategory: RISK_TYPE_META.cyber_attack.category,
    isPriceType: RISK_TYPE_META.cyber_attack.isPriceType,
  },

  // 6. Business (3)
  {
    type: 'supplier_shutdown',
    family: 'business',
    plainTitle: 'Supplier shuts down',
    everydayExample: 'Supplier shuts down: a vendor closes or goes bankrupt',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Upstream closures stay hidden until your vendor runs dry',
    targetCategory: RISK_TYPE_META.supplier_shutdown.category,
    isPriceType: RISK_TYPE_META.supplier_shutdown.isPriceType,
  },
  {
    type: 'raw_material_shortage',
    family: 'business',
    plainTitle: 'Raw material runs short',
    everydayExample: 'Missing ingredient: key granules, ingots, or grain run short across mills',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Starts deep upstream before finished parts run out',
    targetCategory: RISK_TYPE_META.raw_material_shortage.category,
    isPriceType: RISK_TYPE_META.raw_material_shortage.isPriceType,
  },
  {
    type: 'gas_shortage',
    family: 'business',
    plainTitle: 'Cooking or plant gas short',
    everydayExample: 'Gas shortage: commercial cylinders and plant boilers run short on fuel',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Bottling depots ration cylinders before shops get warned',
    targetCategory: RISK_TYPE_META.gas_shortage.category,
    isPriceType: RISK_TYPE_META.gas_shortage.isPriceType,
  },

  // 7. Market & Rules (3)
  {
    type: 'material_price_spike',
    family: 'market_rules',
    plainTitle: 'Material price jump',
    everydayExample: 'Price spike: wholesale rates jump suddenly so your daily margin shrinks',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Upstream cost surges reach your bill days later',
    targetCategory: RISK_TYPE_META.material_price_spike.category,
    isPriceType: RISK_TYPE_META.material_price_spike.isPriceType,
  },
  {
    type: 'fuel_price_hike',
    family: 'market_rules',
    plainTitle: 'Diesel & freight hike',
    everydayExample: 'Fuel hike: diesel goes up, raising delivery charges on every truckload',
    visibilityTag: 'Visible locally',
    visibilityHint: 'Pump rates change overnight and transport surcharges follow',
    targetCategory: RISK_TYPE_META.fuel_price_hike.category,
    isPriceType: RISK_TYPE_META.fuel_price_hike.isPriceType,
  },
  {
    type: 'export_ban',
    family: 'market_rules',
    plainTitle: 'Export ban or rule',
    everydayExample:
      'Export ban: the country stops selling an item abroad, so prices jump',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Government trade notices trigger hoarding within hours',
    targetCategory: RISK_TYPE_META.export_ban.category,
    isPriceType: RISK_TYPE_META.export_ban.isPriceType,
  },

  // 8. Health (2)
  {
    type: 'crop_disease',
    family: 'health',
    plainTitle: 'Crop disease',
    everydayExample: 'Crop blight: leaf rust or cane rot cuts harvest bags from growers',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Begins on distant farms weeks before wholesale sacks tighten',
    targetCategory: RISK_TYPE_META.crop_disease.category,
    isPriceType: RISK_TYPE_META.crop_disease.isPriceType,
  },
  {
    type: 'cattle_disease',
    family: 'health',
    plainTitle: 'Cattle illness',
    everydayExample: 'Livestock illness: dairy villages quarantine cows, cutting morning milk',
    visibilityTag: 'Usually hidden',
    visibilityHint: 'Chilling plants notice falling litres before town booths do',
    targetCategory: RISK_TYPE_META.cattle_disease.category,
    isPriceType: RISK_TYPE_META.cattle_disease.isPriceType,
  },
];

export function getRiskLibraryItem(type: RiskEventType): RiskLibraryItem {
  return (
    RISK_LIBRARY_ITEMS.find((item) => item.type === type) ?? RISK_LIBRARY_ITEMS[0]
  );
}

export interface ShockScenarioPreset {
  type: RiskEventType;
  target: string;
  cityLabel: string;
  severity: number;
  durationDays: number;
  pricePct?: number;
  headline: string;
}

export function buildShockTroubleEvent(
  graph: SupplyChainGraph,
  params: {
    type: RiskEventType;
    target: string;
    severity: number;
    durationDays: number;
    pricePct?: number;
  },
): TroubleEvent {
  const lib = getRiskLibraryItem(params.type);
  const meta = RISK_TYPE_META[params.type];

  let resolvedCity = graph.business.city;
  let lat = graph.business.lat;
  let lng = graph.business.lng;

  if (meta.category === 'place') {
    const place = getPlaceByCity(params.target);
    const matchingSup = graph.suppliers.find(
      (s) => s.city.toLowerCase() === params.target.toLowerCase(),
    );
    resolvedCity = place?.name ?? matchingSup?.city ?? params.target;
    lat = place?.lat ?? matchingSup?.lat ?? lat;
    lng = place?.lng ?? matchingSup?.lng ?? lng;
  } else if (meta.category === 'single_supplier') {
    const sup = graph.suppliers.find((s) => s.id === params.target);
    if (sup) {
      resolvedCity = sup.city;
      lat = sup.lat;
      lng = sup.lng;
    }
  } else {
    const sup = graph.suppliers.find(
      (s) => s.group.toLowerCase() === params.target.toLowerCase(),
    );
    if (sup) {
      resolvedCity = sup.city;
      lat = sup.lat;
      lng = sup.lng;
    }
  }

  const effectiveSeverity = meta.isPriceType
    ? Math.min(1, Math.max(0.1, (params.pricePct ?? 0.25) / 0.5))
    : params.severity;

  const pctText = meta.isPriceType
    ? ` (+${Math.round((params.pricePct ?? 0.25) * 100)}%)`
    : '';

  const summary =
    meta.isPriceType
      ? `What-if check: ${lib.plainTitle}${pctText} hitting ${params.target} near ${resolvedCity}.`
      : `What-if check: ${lib.plainTitle} in ${resolvedCity} lasting ${params.durationDays} days.`;

  return {
    id: `shock-${params.type}-${params.target}-${Date.now()}`,
    type: params.type,
    hazardType: params.type,
    target: params.target,
    severity: effectiveSeverity,
    durationDays: params.durationDays,
    pricePct: meta.isPriceType ? (params.pricePct ?? 0.25) : undefined,
    confidence: 0.9,
    sourceKind: 'manual',
    sourceText: summary,
    language: 'en',
    translation: summary,
    title: `${lib.plainTitle}${pctText} in ${resolvedCity}`,
    rawText: summary,
    plainSummary: summary,
    sourceType: 'user_text',
    sourceName: 'What-if shock test',
    verifiedStatus: 'verified',
    region: resolvedCity,
    lat,
    lng,
    expectedDurationDays: params.durationDays,
    affectedKeywords: [params.target.toLowerCase(), resolvedCity.toLowerCase()],
    publishedAt: new Date().toISOString(),
    readerMode: 'offline-rule',
  };
}

/**
 * Picks a realistic surprise scenario guaranteed to connect to the user's active chain.
 */
export function pickRandomShockScenario(
  graph: SupplyChainGraph,
  persona: PersonaType,
  excludeType?: RiskEventType,
): ShockScenarioPreset {
  const candidates: ShockScenarioPreset[] = [];
  const suppliers = graph.suppliers;
  if (suppliers.length === 0) {
    return {
      type: 'flood',
      target: graph.business.city,
      cityLabel: graph.business.city,
      severity: 0.6,
      durationDays: 10,
      headline: `Heavy rain near ${graph.business.city}`,
    };
  }

  const pickByGroup = (group: string) =>
    suppliers.find((s) => s.group.toLowerCase() === group.toLowerCase());
  const singleSource =
    suppliers.find((s) => s.isSingleSource && s.layer >= 2) ??
    suppliers.find((s) => s.isSingleSource) ??
    suppliers[0];
  const hiddenUpper =
    suppliers.find((s) => s.layer === 3) ??
    suppliers.find((s) => s.layer === 2) ??
    suppliers[0];

  if (persona === 'shop') {
    const milkSup = pickByGroup('milk');
    if (milkSup) {
      candidates.push(
        {
          type: 'flood',
          target: milkSup.city,
          cityLabel: milkSup.city,
          severity: 0.8,
          durationDays: 10,
          headline: `Flooding hits dairy routes around ${milkSup.city}`,
        },
        {
          type: 'cattle_disease',
          target: milkSup.group,
          cityLabel: milkSup.city,
          severity: 0.6,
          durationDays: 14,
          headline: `Cattle illness drops farm milk collection in ${milkSup.city}`,
        },
      );
    }

    const gasSup = pickByGroup('gas');
    if (gasSup) {
      candidates.push(
        {
          type: 'port_congestion',
          target: gasSup.city,
          cityLabel: gasSup.city,
          severity: 0.8,
          durationDays: 12,
          headline: `Import terminal jam delays cooking gas from ${gasSup.city}`,
        },
        {
          type: 'gas_shortage',
          target: gasSup.group,
          cityLabel: gasSup.city,
          severity: 0.8,
          durationDays: 11,
          headline: `Commercial LPG cylinder shortage tightens supply`,
        },
      );
    }

    const sugarSup = pickByGroup('sugar');
    if (sugarSup) {
      candidates.push(
        {
          type: 'export_ban',
          target: sugarSup.group,
          cityLabel: sugarSup.city,
          severity: 0.6,
          durationDays: 18,
          headline: `Trade curb triggers sugar hoarding across mills`,
        },
        {
          type: 'material_price_spike',
          target: sugarSup.group,
          cityLabel: sugarSup.city,
          severity: 0.7,
          durationDays: 21,
          pricePct: 0.35,
          headline: `Sugar wholesale rate jumps +35% in ${sugarSup.city}`,
        },
      );
    }

    const teaSup = pickByGroup('tea');
    if (teaSup) {
      candidates.push({
        type: 'crop_disease',
        target: teaSup.group,
        cityLabel: teaSup.city,
        severity: 0.6,
        durationDays: 14,
        headline: `Tea leaf blight slows harvest in ${teaSup.city}`,
      });
    }
  } else {
    const resinSup = pickByGroup('resin');
    if (resinSup) {
      candidates.push(
        {
          type: 'factory_fire',
          target: resinSup.city,
          cityLabel: resinSup.city,
          severity: 0.8,
          durationDays: 16,
          headline: `Chemical unit fire halts resin output in ${resinSup.city}`,
        },
        {
          type: 'raw_material_shortage',
          target: resinSup.group,
          cityLabel: resinSup.city,
          severity: 0.8,
          durationDays: 15,
          headline: `Nylon-66 granules run short across Gujarat compounders`,
        },
      );
    }

    const aluSup = pickByGroup('aluminium');
    if (aluSup) {
      candidates.push(
        {
          type: 'power_outage',
          target: aluSup.city,
          cityLabel: aluSup.city,
          severity: 0.8,
          durationDays: 11,
          headline: `Industrial feeder trip stalls CNC & casting units in ${aluSup.city}`,
        },
        {
          type: 'material_price_spike',
          target: aluSup.group,
          cityLabel: aluSup.city,
          severity: 0.7,
          durationDays: 21,
          pricePct: 0.35,
          headline: `Aluminium ingot spot price jumps +35%`,
        },
      );
    }

    const steelSup = pickByGroup('steel');
    if (steelSup) {
      candidates.push({
        type: 'export_ban',
        target: steelSup.group,
        cityLabel: steelSup.city,
        severity: 0.6,
        durationDays: 18,
        headline: `Alloy quota rules squeeze billet supply from ${steelSup.city}`,
      });
    }
  }

  // Always include realistic single-supplier & transport disruptions from active graph
  candidates.push(
    {
      type: 'transport_strike',
      target: hiddenUpper.city,
      cityLabel: hiddenUpper.city,
      severity: 0.8,
      durationDays: 12,
      headline: `Lorry owners strike halts dispatches from ${hiddenUpper.city}`,
    },
    {
      type: 'cyber_attack',
      target: singleSource.id,
      cityLabel: singleSource.city,
      severity: 0.8,
      durationDays: 10,
      headline: `Billing & dispatch computers locked at ${singleSource.name}`,
    },
    {
      type: 'supplier_shutdown',
      target: singleSource.id,
      cityLabel: singleSource.city,
      severity: 0.9,
      durationDays: 18,
      headline: `${singleSource.name} stops production unexpectedly`,
    },
    {
      type: 'fuel_price_hike',
      target: hiddenUpper.city,
      cityLabel: hiddenUpper.city,
      severity: 0.6,
      durationDays: 21,
      pricePct: 0.3,
      headline: `Diesel hike pushes freight charges up +30% from ${hiddenUpper.city}`,
    },
  );

  const filtered = excludeType
    ? candidates.filter((c) => c.type !== excludeType)
    : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return chosen;
}
