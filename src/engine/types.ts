export type PersonaType = 'shop' | 'factory';

export type UiLanguage = 'en' | 'ta' | 'hi';

export type NewsLanguage = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr';

export type AppRoute =
  | 'landing'
  | 'overview'
  | 'chain-map'
  | 'news-watch'
  | 'ripple'
  | 'actions';

export type SupplierLayer = 1 | 2 | 3;

export type RiskEventType =
  | 'flood'
  | 'cyclone'
  | 'heatwave'
  | 'water_shortage'
  | 'power_outage'
  | 'transport_strike'
  | 'port_congestion'
  | 'highway_blockade'
  | 'factory_fire'
  | 'crop_disease'
  | 'cattle_disease'
  | 'raw_material_shortage'
  | 'export_ban'
  | 'gas_shortage'
  | 'material_price_spike'
  | 'fuel_price_hike'
  | 'supplier_shutdown'
  | 'cyber_attack';

export type HazardType = RiskEventType;

export type EventSourceKind = 'news' | 'govt alert' | 'forward' | 'manual';

export type SourceType =
  | 'official_bulletin'
  | 'local_news'
  | 'mandi_notice'
  | 'whatsapp_forward'
  | 'user_voice'
  | 'user_text';

export type VerifiedStatus = 'verified' | 'unverified';

export type TrafficLight = 'Safe' | 'Watch' | 'Danger' | 'Urgent';

export type AlertLevel = 'safe' | 'watch' | 'warning' | 'critical';

export type ReaderMode = 'groq' | 'offline-rule';

export interface BusinessProfile {
  id: string;
  persona: PersonaType;
  businessName: string;
  businessKind: string;
  ownerRole: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  dailyRevenueInr: number;
  dailySalesLostInr: number;
  ownStockDays: number;
  summaryLine: string;
}

export interface SupplierNode {
  id: string;
  name: string;
  itemSupplied: string;
  whatTheySupply: string; // One-line plain explanation
  group: string; // Material group for material risks
  layer: SupplierLayer;
  city: string;
  state: string;
  lat: number;
  lng: number;
  stockDays: number;
  leadTimeDays: number;
  importance: number; // 0..1
  monthlySpendInr: number;
  dailyValueInr: number;
  alternativesCount: number;
  alternateSuppliers: string[]; // 1-2 real-sounding names in other cities
  onTimeDeliveryPct: number;
  isSingleSource: boolean;
  reliabilityScore: number; // 0..1
  verified: boolean;
  discoveredBy: 'user' | 'chain-discovery';
  keywords: string[];
}

export interface SuppliesLink {
  id: string;
  fromId: string;
  toId: string; // 'YOU' for Layer 1 -> Business, otherwise another SupplierNode id
  relationship: 'SUPPLIES';
  sharePct: number; // 0..100
  transitDays: number;
  substitutable: boolean;
}

export interface SupplyChainGraph {
  business: BusinessProfile;
  suppliers: SupplierNode[];
  links: SuppliesLink[];
}

export interface EngineEvent {
  id: string;
  type: RiskEventType;
  target: string; // city for place risks, group for material risks, supplierId for single-supplier risks
  severity: number; // 0..1 (or min(1, pricePct / 0.5) for price types)
  durationDays: number;
  pricePct?: number; // price types only (e.g. 0.25 for +25%)
  confidence: number; // 0..1
  sourceKind: EventSourceKind;
  sourceText: string;
  language: NewsLanguage;
  translation: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface TroubleEvent extends EngineEvent {
  title: string;
  rawText: string;
  plainSummary: string;
  sourceType: SourceType;
  sourceName: string;
  verifiedStatus: VerifiedStatus;
  hazardType: RiskEventType;
  region: string;
  lat: number;
  lng: number;
  expectedDurationDays: number;
  affectedKeywords: string[];
  publishedAt: string;
  readerMode: ReaderMode;
  sourceUrl?: string;
  isLive?: boolean;
  groundingSources?: GroundingSource[];
}

export interface FormulaTerm {
  label: string;
  expression: string;
  value: string | number;
}

export interface AffectedSupplierOutput {
  supplierId: string;
  supplierName: string;
  layer: SupplierLayer;
  closeness: number;
  chain: SupplierNode[]; // Affected supplier -> ... -> Layer 1 supplier
  stockDays: number; // B = sum(stockDays on chain) + 2 * chain.length
  daysUntilHurt: number; // B
  exposedDays: number; // max(0, durationDays - B)
  stress: number; // min(1, exposedDays / durationDays)
  soleFactor: number; // avg over chain of (1.0 if soleSource else 0.4)
  riskScore: number; // 0..100
  rawRiskScore: number; // Before rumour safety cap
  rumourSafetyCapped: boolean;
  light: TrafficLight;
  moneyAtRisk: number;
  plainWhy: [string, string, string];
  formulaTerms: FormulaTerm[];
}

export interface SimulationConfidenceResult {
  runs: number;
  seed: number;
  chanceOfRunningOutPct: number; // % of runs with exposedDays > 0
  bestCase: {
    exposedDays: number;
    riskScore: number;
    moneyAtRisk: number;
  };
  likelyCase: {
    exposedDays: number;
    riskScore: number;
    moneyAtRisk: number;
  };
  worstCase: {
    exposedDays: number;
    riskScore: number;
    moneyAtRisk: number;
  };
}

export interface SeasonNote {
  month: number; // 1..12
  monthName: string;
  label: 'Typical season pattern, not a forecast';
  headline: string;
  details: string;
  tags: string[];
}

export interface WhyExplanation {
  metricId: 'riskScore' | 'daysToImpact' | 'chanceOfRunningOutPct' | 'costAtRiskInr' | 'overallHealth';
  label: string;
  sentences: [string, string, string];
  formula: string;
  inputs: Record<string, string | number>;
}

export interface RipplePathStep {
  supplierId: string;
  supplierName: string;
  layer: SupplierLayer | 0;
  itemSupplied: string;
  city: string;
  stockDays: number;
  sharePct: number;
  transitDays: number;
}

export interface RippleImpact {
  eventId: string;
  eventTitle: string;
  sourceSupplierId: string;
  sourceSupplierName: string;
  sourceLayer: SupplierLayer;
  verifiedStatus: VerifiedStatus;
  hazardType: RiskEventType;
  proximityKm: number;
  proximityScore: number;
  pathDependencyPct: number;
  daysToImpact: number;
  daysRange: {
    earlyDays: number;
    likelyDays: number;
    lateDays: number;
  };
  chanceOfRunningOutPct: number;
  costAtRiskInr: number;
  savingsIfActTodayInr: number;
  riskScore: number;
  alertLevel: AlertLevel;
  light: TrafficLight;
  rumourSafetyCapped: boolean;
  assessment: AffectedSupplierOutput;
  simulation: SimulationConfidenceResult;
  path: RipplePathStep[];
  dailyTimeline: Array<{
    day: number;
    stockRemainingPct: number;
    withoutActionCostInr: number;
    withActionCostInr: number;
  }>;
  recommendedAction: string;
  actionUrgency: 'today' | 'this_week' | 'verify_first' | 'monitor';
  whyByMetric: {
    riskScore: WhyExplanation;
    daysToImpact: WhyExplanation;
    chanceOfRunningOutPct: WhyExplanation;
    costAtRiskInr: WhyExplanation;
  };
  confidence: {
    scorePct: number;
    trialCount: number;
    reasons: string[];
  };
}

export interface ActionItem {
  id: string;
  eventId: string;
  supplierId: string;
  supplierName: string;
  layer: SupplierLayer;
  title: string;
  plainReason: string;
  urgency: 'today' | 'this_week' | 'verify_first' | 'monitor';
  potentialSavingsInr: number;
  verifiedStatus: VerifiedStatus;
  completed: boolean;
}

export interface ChainRiskSummary {
  businessId: string;
  overallHealthScore: number;
  overallRiskScore: number; // Exposure = round(mean of top 5 risk scores)
  highestAlertLevel: AlertLevel;
  earliestImpactDays: number | null;
  totalCostAtRiskInr: number;
  totalPotentialSavingsInr: number;
  singleSourceCount: number;
  hiddenSupplierCount: number;
  verifiedAlertCount: number;
  unverifiedRumourCount: number;
  impacts: RippleImpact[];
  actions: ActionItem[];
  overallWhy: WhyExplanation;
}

export interface DiscoveredLinkSuggestion {
  id: string;
  forLayer1SupplierId: string;
  forLayer1SupplierName: string;
  proposedSupplier: Omit<SupplierNode, 'id'>;
  proposedLink: Omit<SuppliesLink, 'id' | 'fromId'>;
  reasonPlain: string;
  confidencePct: number;
}

export interface CypherAudit {
  actionName: string;
  description: string;
  query: string;
  params: Record<string, string | number | boolean | string[]>;
}

export interface ServiceResult<T> {
  data: T;
  cypher: CypherAudit;
  computedAt: string;
  durationMs: number;
}

export interface SelfTestResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}
