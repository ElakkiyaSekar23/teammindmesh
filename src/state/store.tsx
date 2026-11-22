import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getPlaceByCity } from '../data/gazetteer';
import { getPersonaChainGraph } from '../data/personas';
import { SAMPLE_NEWS_EVENTS } from '../data/sampleNews';
import {
  buildCustomShopGraph,
  type ShopBuilderConfig,
} from '../data/shopBuilder';
import {
  deepTierService,
  VERIFICATION_SCENARIOS,
  type AlertLevel,
  type ChainRiskSummary,
  type CypherAudit,
  type DiscoveredLinkSuggestion,
  type GroundingSource,
  type PersonaType,
  type RiskEventType,
  type SelfTestResult,
  type SourceType,
  type SupplierLayer,
  type SupplyChainGraph,
  type TroubleEvent,
  type UiLanguage,
} from '../engine';
import { clamp } from '../engine/math';
import { getTranslation, type TranslationKeys } from '../i18n';

export type LiveWorldStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LiveWorldMeta {
  sourceMode?: 'groq-live' | 'live-feeds';
  notice?: string;
  summary: string;
  sources: GroundingSource[];
  updatedAt: string;
  searchQueries: string[];
}

const STORAGE_KEY = 'deeptier_v3_state';

export type ThemeMode = 'dark' | 'light';

export interface SavedComparisonRun {
  id: string;
  label: string;
  eventTitle: string;
  supplierName: string;
  extraStockDays: number;
  useBackupSupplier: boolean;
  daysToImpact: number;
  exposedDays: number;
  moneyAtRisk: number;
  savedInr: number;
  riskScore: number;
  alertLevel: AlertLevel;
  bestMoney: number;
  likelyMoney: number;
  worstMoney: number;
}

interface PersistedState {
  persona: PersonaType;
  language: UiLanguage;
  theme: ThemeMode;
  hasPickedWorld: boolean;
  isCustomShopActive: boolean;
  shopBuilderConfig: ShopBuilderConfig;
  outerRingsDiscovered: boolean;
  graphsByPersona: Record<PersonaType, SupplyChainGraph>;
  eventsByPersona: Record<PersonaType, TroubleEvent[]>;
  liveWorldMetaByPersona?: Partial<Record<PersonaType, LiveWorldMeta | null>>;
  completedActionIds: string[];
  savedRuns: SavedComparisonRun[];
}

const DEFAULT_BUILDER_CONFIG: ShopBuilderConfig = {
  shopCategory: 'tea_stall',
  shopName: 'My Tea Stall',
  shopCity: 'Chennai',
  selectedProducts: ['milk', 'tea_powder', 'sugar', 'lpg', 'packaging'],
  customProducts: [],
  stockDaysBySupplierId: {},
  liveNodeAdjustments: {},
};

function isValidGraph(g: unknown): g is SupplyChainGraph {
  if (!g || typeof g !== 'object') return false;
  const candidate = g as Partial<SupplyChainGraph>;
  if (!candidate.business || typeof candidate.business.dailySalesLostInr !== 'number') {
    return false;
  }
  if (!Array.isArray(candidate.suppliers) || !Array.isArray(candidate.links)) {
    return false;
  }
  return candidate.suppliers.every(
    (s) =>
      s &&
      typeof s.id === 'string' &&
      typeof s.group === 'string' &&
      typeof s.importance === 'number' &&
      typeof s.whatTheySupply === 'string' &&
      Array.isArray(s.alternateSuppliers),
  );
}

function isValidEventList(list: unknown): list is TroubleEvent[] {
  if (!Array.isArray(list)) return false;
  return list.every(
    (ev) =>
      ev &&
      typeof ev === 'object' &&
      typeof (ev as Partial<TroubleEvent>).id === 'string' &&
      typeof (ev as Partial<TroubleEvent>).type === 'string' &&
      typeof (ev as Partial<TroubleEvent>).target === 'string' &&
      typeof (ev as Partial<TroubleEvent>).durationDays === 'number',
  );
}

function loadInitialState(): PersistedState {
  const fallback: PersistedState = {
    persona: 'shop',
    language: 'en',
    theme: 'dark',
    hasPickedWorld: false,
    isCustomShopActive: false,
    shopBuilderConfig: DEFAULT_BUILDER_CONFIG,
    outerRingsDiscovered: false,
    graphsByPersona: {
      shop: getPersonaChainGraph('shop'),
      factory: getPersonaChainGraph('factory'),
    },
    eventsByPersona: {
      shop: [...SAMPLE_NEWS_EVENTS.shop],
      factory: [...SAMPLE_NEWS_EVENTS.factory],
    },
    liveWorldMetaByPersona: {},
    completedActionIds: [],
    savedRuns: [],
  };

  if (typeof window === 'undefined') return fallback;

  try {
    window.localStorage.removeItem('deeptier_v1_state');
    const legacyV2 = window.localStorage.getItem('deeptier_v2_state');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw && legacyV2) {
      window.localStorage.removeItem('deeptier_v2_state');
      const v2 = JSON.parse(legacyV2) as Partial<PersistedState>;
      if (v2.isCustomShopActive && isValidGraph(v2.graphsByPersona?.shop)) {
        return {
          ...fallback,
          persona: v2.persona === 'factory' ? 'factory' : 'shop',
          language: v2.language === 'ta' || v2.language === 'hi' ? v2.language : 'en',
          theme: v2.theme === 'light' ? 'light' : 'dark',
          hasPickedWorld: Boolean(v2.hasPickedWorld),
          isCustomShopActive: true,
          shopBuilderConfig: v2.shopBuilderConfig ?? DEFAULT_BUILDER_CONFIG,
          graphsByPersona: {
            shop: v2.graphsByPersona.shop,
            factory: fallback.graphsByPersona.factory,
          },
        };
      }
      return fallback;
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const builderCfg = parsed.shopBuilderConfig;
    const validBuilderCfg: ShopBuilderConfig =
      builderCfg &&
      typeof builderCfg.shopCategory === 'string' &&
      Array.isArray(builderCfg.selectedProducts)
        ? {
            shopCategory: builderCfg.shopCategory,
            customCategoryLabel:
              typeof builderCfg.customCategoryLabel === 'string'
                ? builderCfg.customCategoryLabel
                : undefined,
            shopName: typeof builderCfg.shopName === 'string' ? builderCfg.shopName : 'My Tea Stall',
            shopCity: typeof builderCfg.shopCity === 'string' ? builderCfg.shopCity : 'Chennai',
            shopState: typeof builderCfg.shopState === 'string' ? builderCfg.shopState : undefined,
            shopLat: typeof builderCfg.shopLat === 'number' ? builderCfg.shopLat : undefined,
            shopLng: typeof builderCfg.shopLng === 'number' ? builderCfg.shopLng : undefined,
            selectedProducts: builderCfg.selectedProducts,
            customProducts: Array.isArray(builderCfg.customProducts)
              ? builderCfg.customProducts
              : [],
            stockDaysBySupplierId:
              builderCfg.stockDaysBySupplierId &&
              typeof builderCfg.stockDaysBySupplierId === 'object'
                ? builderCfg.stockDaysBySupplierId
                : {},
            liveNodeAdjustments:
              builderCfg.liveNodeAdjustments &&
              typeof builderCfg.liveNodeAdjustments === 'object'
                ? builderCfg.liveNodeAdjustments
                : {},
          }
        : DEFAULT_BUILDER_CONFIG;

    return {
      persona: parsed.persona === 'factory' ? 'factory' : 'shop',
      language:
        parsed.language === 'ta' || parsed.language === 'hi' ? parsed.language : 'en',
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      hasPickedWorld: Boolean(parsed.hasPickedWorld),
      isCustomShopActive: Boolean(parsed.isCustomShopActive),
      shopBuilderConfig: validBuilderCfg,
      outerRingsDiscovered: Boolean(parsed.outerRingsDiscovered),
      graphsByPersona:
        isValidGraph(parsed.graphsByPersona?.shop) &&
        isValidGraph(parsed.graphsByPersona?.factory)
          ? parsed.graphsByPersona
          : fallback.graphsByPersona,
      eventsByPersona:
        isValidEventList(parsed.eventsByPersona?.shop) &&
        isValidEventList(parsed.eventsByPersona?.factory)
          ? parsed.eventsByPersona
          : fallback.eventsByPersona,
      liveWorldMetaByPersona:
        parsed.liveWorldMetaByPersona &&
        typeof parsed.liveWorldMetaByPersona === 'object'
          ? parsed.liveWorldMetaByPersona
          : {},
      completedActionIds: Array.isArray(parsed.completedActionIds)
        ? parsed.completedActionIds
        : [],
      savedRuns: Array.isArray(parsed.savedRuns) ? parsed.savedRuns.slice(0, 3) : [],
    };
  } catch {
    return fallback;
  }
}

export interface StoryNewsDraft {
  text: string;
  sourceType: SourceType;
  englishHint: string;
  autoAnalyse: boolean;
  nonce: number;
}

export interface StoryTryItPreset {
  days: number;
  nonce: number;
}

export interface StoryShockPreset {
  type: RiskEventType;
  target: string;
  severity: number;
  durationDays: number;
  pricePct?: number;
  autoRun: boolean;
  nonce: number;
}

interface DeepTierContextValue {
  persona: PersonaType;
  language: UiLanguage;
  theme: ThemeMode;
  hasPickedWorld: boolean;
  isWorldPickerOpen: boolean;
  isCustomShopActive: boolean;
  shopBuilderConfig: ShopBuilderConfig;
  outerRingsDiscovered: boolean;
  t: TranslationKeys;
  judgesMode: boolean;
  setJudgesMode: (enabled: boolean) => void;
  setOuterRingsDiscovered: (discovered: boolean) => void;
  activeScenarioId: string | null;
  loadVerificationScenario: (scenarioId: string) => void;
  storyNewsDraft: StoryNewsDraft | null;
  triggerStoryNews: (draft: Omit<StoryNewsDraft, 'nonce'>) => void;
  storyTryItExtraDays: StoryTryItPreset | null;
  triggerStoryOrderExtraStock: (days: number) => void;
  storyShockPreset: StoryShockPreset | null;
  triggerStoryShockPreset: (preset: Omit<StoryShockPreset, 'nonce'>) => void;
  clearStoryShockPreset: () => void;
  graph: SupplyChainGraph;
  events: TroubleEvent[];
  selectedEventId: string | null;
  riskSummary: ChainRiskSummary;
  discoveredSuggestions: DiscoveredLinkSuggestion[];
  auditHistory: CypherAudit[];
  selfTests: SelfTestResult[];
  isReadingNews: boolean;
  liveWorldStatus: LiveWorldStatus;
  liveWorldError: string | null;
  liveWorldMeta: LiveWorldMeta | null;
  refreshLiveWorldAlerts: () => Promise<void>;
  recordAudit: (audit: CypherAudit) => void;
  setPersona: (persona: PersonaType) => void;
  selectDemoWorld: (persona: PersonaType) => void;
  applyCustomShop: (config: ShopBuilderConfig) => void;
  openWorldPicker: () => void;
  closeWorldPicker: () => void;
  setLanguage: (lang: UiLanguage) => void;
  toggleTheme: () => void;
  toggleJudgesMode: () => void;
  sharpenOuterRings: () => void;
  setSelectedEventId: (eventId: string | null) => void;
  updateSupplierStockDays: (supplierId: string, stockDays: number) => void;
  analyzeAndAddNews: (
    text: string,
    sourceType: SourceType,
    sourceName?: string,
  ) => Promise<TroubleEvent>;
  analyzeNewsDraft: (params: {
    text: string;
    sourceType: SourceType;
    sourceName?: string;
    englishFallbackHint?: string;
  }) => Promise<Awaited<ReturnType<typeof deepTierService.analyzeNewsItem>>['data']>;
  addAlerts: (newEvents: TroubleEvent[]) => void;
  addSupplier: (input: {
    name: string;
    itemSupplied: string;
    layer: SupplierLayer;
    city: string;
    stockDays: number;
    toId: string;
    sharePct: number;
    transitDays: number;
  }) => void;
  applyDiscoveredSuggestion: (suggestionId: string) => void;
  toggleActionCompleted: (actionId: string) => void;
  savedRuns: SavedComparisonRun[];
  saveRunForCompare: (run: Omit<SavedComparisonRun, 'id'>) => void;
  removeSavedRun: (id: string) => void;
  clearSavedRuns: () => void;
  resetDemoState: () => void;
}

const DeepTierContext = createContext<DeepTierContextValue | null>(null);

export function DeepTierProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedState>(() => loadInitialState());
  const [isWorldPickerOpen, setIsWorldPickerOpen] = useState<boolean>(
    () => !persisted.hasPickedWorld,
  );
  const [judgesMode, setJudgesMode] = useState<boolean>(false); // OFF by default
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isReadingNews, setIsReadingNews] = useState<boolean>(false);
  const [liveWorldStatus, setLiveWorldStatus] = useState<LiveWorldStatus>(() =>
    persisted.liveWorldMetaByPersona?.[persisted.persona] ? 'ready' : 'idle',
  );
  const [liveWorldError, setLiveWorldError] = useState<string | null>(null);
  const liveRequestNonceRef = useRef<number>(0);
  const [auditHistory, setAuditHistory] = useState<CypherAudit[]>([]);
  const [storyNewsDraft, setStoryNewsDraft] = useState<StoryNewsDraft | null>(null);
  const [storyTryItExtraDays, setStoryTryItExtraDays] = useState<StoryTryItPreset | null>(null);
  const [storyShockPreset, setStoryShockPreset] = useState<StoryShockPreset | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', persisted.theme === 'dark');
      document.documentElement.lang = persisted.language;
      document.documentElement.style.colorScheme = persisted.theme;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [persisted]);

  const graph = persisted.graphsByPersona[persisted.persona];
  const events = persisted.eventsByPersona[persisted.persona];
  const t = useMemo(() => getTranslation(persisted.language), [persisted.language]);

  const riskEvaluation = useMemo(
    () =>
      deepTierService.evaluateChainRisk(
        graph,
        events,
        persisted.completedActionIds,
      ),
    [graph, events, persisted.completedActionIds],
  );

  const discoveryResult = useMemo(
    () => deepTierService.discoverHiddenSuppliers(graph),
    [graph],
  );

  const selfTestsResult = useMemo(() => deepTierService.runSelfTests(), []);

  useEffect(() => {
    setAuditHistory((prev) => {
      const next = [riskEvaluation.cypher, ...prev];
      const deduped: CypherAudit[] = [];
      const seen = new Set<string>();
      for (const item of next) {
        const key = `${item.actionName}:${JSON.stringify(item.params)}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }
      return deduped.slice(0, 8);
    });
  }, [riskEvaluation.cypher]);

  const pushAudit = useCallback((audit: CypherAudit) => {
    setAuditHistory((prev) => [audit, ...prev].slice(0, 8));
  }, []);

  const runLiveWorldScan = useCallback(
    async (
      targetPersona: PersonaType,
      targetGraph: SupplyChainGraph,
      customCfg?: ShopBuilderConfig,
    ) => {
      const requestNonce = ++liveRequestNonceRef.current;
      setLiveWorldStatus('loading');
      setLiveWorldError(null);

      try {
        const res = await deepTierService.fetchLiveWorldAlerts({
          graph: targetGraph,
          uiLanguage: persisted.language,
        });
        if (liveRequestNonceRef.current !== requestNonce) return;

        pushAudit(res.cypher);

        const shopLoc = res.data.shopLocation;
        const liveAdjustments = res.data.nodeAdjustments ?? {};
        const resolvedConfig: ShopBuilderConfig | undefined = customCfg
          ? {
              ...customCfg,
              shopCity:
                shopLoc?.city?.trim() ||
                customCfg.shopCity ||
                targetGraph.business.city,
              shopState: shopLoc?.state?.trim() || customCfg.shopState,
              shopLat:
                typeof shopLoc?.lat === 'number' ? shopLoc.lat : customCfg.shopLat,
              shopLng:
                typeof shopLoc?.lng === 'number' ? shopLoc.lng : customCfg.shopLng,
              liveNodeAdjustments: {
                ...(customCfg.liveNodeAdjustments ?? {}),
                ...liveAdjustments,
              },
            }
          : undefined;

        const refreshedGraph =
          targetPersona === 'shop' && resolvedConfig
            ? buildCustomShopGraph(resolvedConfig)
            : Object.keys(liveAdjustments).length > 0
              ? {
                  ...targetGraph,
                  suppliers: targetGraph.suppliers.map((s) => {
                    const adj = liveAdjustments[s.id];
                    if (!adj) return s;
                    return {
                      ...s,
                      onTimeDeliveryPct:
                        adj.onTimeDeliveryPct ?? s.onTimeDeliveryPct,
                      reliabilityScore: adj.reliabilityScore ?? s.reliabilityScore,
                    };
                  }),
                  links: targetGraph.links.map((l) => {
                    const adj = liveAdjustments[l.fromId];
                    if (!adj || typeof adj.transitDays !== 'number') return l;
                    return { ...l, transitDays: adj.transitDays };
                  }),
                }
              : targetGraph;

        setPersisted((prev) => ({
          ...prev,
          shopBuilderConfig: resolvedConfig ?? prev.shopBuilderConfig,
          graphsByPersona: {
            ...prev.graphsByPersona,
            [targetPersona]: refreshedGraph,
          },
          eventsByPersona: {
            ...prev.eventsByPersona,
            [targetPersona]: res.data.alerts,
          },
          liveWorldMetaByPersona: {
            ...(prev.liveWorldMetaByPersona ?? {}),
            [targetPersona]: {
              sourceMode: res.data.sourceMode,
              notice: res.data.notice,
              summary: res.data.worldSummary,
              sources: res.data.groundingSources,
              updatedAt: res.data.fetchedAt,
              searchQueries: res.data.webSearchQueries,
            },
          },
        }));
        setSelectedEventId(res.data.alerts[0]?.id ?? null);
        setLiveWorldStatus('ready');
      } catch (err) {
        if (liveRequestNonceRef.current !== requestNonce) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Could not fetch live world alerts right now.';
        setLiveWorldError(message);
        setLiveWorldStatus('error');
      }
    },
    [persisted.language, pushAudit],
  );

  const refreshLiveWorldAlerts = useCallback(async () => {
    await runLiveWorldScan(
      persisted.persona,
      graph,
      persisted.isCustomShopActive && persisted.persona === 'shop'
        ? persisted.shopBuilderConfig
        : undefined,
    );
  }, [
    graph,
    persisted.isCustomShopActive,
    persisted.persona,
    persisted.shopBuilderConfig,
    runLiveWorldScan,
  ]);

  const setPersona = useCallback((persona: PersonaType) => {
    setPersisted((prev) => ({ ...prev, persona, hasPickedWorld: true }));
    setIsWorldPickerOpen(false);
    setSelectedEventId(null);
  }, []);

  const selectDemoWorld = useCallback((persona: PersonaType) => {
    liveRequestNonceRef.current += 1;
    setLiveWorldError(null);
    setLiveWorldStatus('idle');
    setPersisted((prev) => ({
      ...prev,
      persona,
      hasPickedWorld: true,
      isCustomShopActive: persona === 'shop' ? false : prev.isCustomShopActive,
      graphsByPersona: {
        ...prev.graphsByPersona,
        [persona]: getPersonaChainGraph(persona),
      },
      eventsByPersona: {
        ...prev.eventsByPersona,
        [persona]: [...SAMPLE_NEWS_EVENTS[persona]],
      },
      liveWorldMetaByPersona: {
        ...(prev.liveWorldMetaByPersona ?? {}),
        [persona]: null,
      },
    }));
    setIsWorldPickerOpen(false);
    setSelectedEventId(null);
  }, []);

  const applyCustomShop = useCallback(
    (config: ShopBuilderConfig) => {
      const customGraph = buildCustomShopGraph(config);
      setPersisted((prev) => ({
        ...prev,
        persona: 'shop',
        hasPickedWorld: true,
        isCustomShopActive: true,
        shopBuilderConfig: config,
        outerRingsDiscovered: true,
        graphsByPersona: {
          ...prev.graphsByPersona,
          shop: customGraph,
        },
        eventsByPersona: {
          ...prev.eventsByPersona,
          shop: [],
        },
        liveWorldMetaByPersona: {
          ...(prev.liveWorldMetaByPersona ?? {}),
          shop: null,
        },
      }));
      setIsWorldPickerOpen(false);
      setSelectedEventId(null);
      void runLiveWorldScan('shop', customGraph, config);
    },
    [runLiveWorldScan],
  );

  const openWorldPicker = useCallback(() => {
    setIsWorldPickerOpen(true);
  }, []);

  const closeWorldPicker = useCallback(() => {
    setPersisted((prev) => ({ ...prev, hasPickedWorld: true }));
    setIsWorldPickerOpen(false);
  }, []);

  const setLanguage = useCallback((language: UiLanguage) => {
    setPersisted((prev) => ({ ...prev, language }));
  }, []);

  const toggleTheme = useCallback(() => {
    setPersisted((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const toggleJudgesMode = useCallback(() => {
    setJudgesMode((prev) => !prev);
  }, []);

  const setOuterRingsDiscovered = useCallback((discovered: boolean) => {
    setPersisted((prev) => ({
      ...prev,
      outerRingsDiscovered: discovered,
      graphsByPersona: {
        ...prev.graphsByPersona,
        [prev.persona]: {
          ...prev.graphsByPersona[prev.persona],
          suppliers: prev.graphsByPersona[prev.persona].suppliers.map((s) => ({
            ...s,
            verified: discovered ? true : s.layer === 1,
          })),
        },
      },
    }));
  }, []);

  const sharpenOuterRings = useCallback(() => {
    setPersisted((prev) => ({
      ...prev,
      outerRingsDiscovered: true,
      graphsByPersona: {
        ...prev.graphsByPersona,
        [prev.persona]: {
          ...prev.graphsByPersona[prev.persona],
          suppliers: prev.graphsByPersona[prev.persona].suppliers.map((s) => ({
            ...s,
            verified: true,
          })),
        },
      },
    }));
    pushAudit(discoveryResult.cypher);
  }, [discoveryResult.cypher, pushAudit]);

  const loadVerificationScenario = useCallback(
    (scenarioId: string) => {
      const spec = VERIFICATION_SCENARIOS.find((s) => s.id === scenarioId);
      if (!spec) return;
      const freshGraph = getPersonaChainGraph(spec.persona);
      const matchedSup = freshGraph.suppliers.find(
        (s) =>
          s.id === spec.event.target ||
          s.city.toLowerCase() === spec.event.target.toLowerCase() ||
          s.group.toLowerCase() === spec.event.target.toLowerCase(),
      );
      const geo = getPlaceByCity(spec.event.target);
      const lat = matchedSup?.lat ?? geo?.lat ?? freshGraph.business.lat;
      const lng = matchedSup?.lng ?? geo?.lng ?? freshGraph.business.lng;
      const region = matchedSup?.city ?? geo?.name ?? spec.event.target;

      const troubleEvent: TroubleEvent = {
        ...spec.event,
        title: spec.event.translation,
        rawText: spec.event.sourceText,
        plainSummary: spec.event.translation,
        sourceType:
          spec.event.sourceKind === 'govt alert'
            ? 'official_bulletin'
            : spec.event.sourceKind === 'forward'
              ? 'whatsapp_forward'
              : 'local_news',
        sourceName: spec.shortLabel,
        verifiedStatus: spec.event.sourceKind === 'forward' ? 'unverified' : 'verified',
        hazardType: spec.event.type,
        region,
        lat,
        lng,
        expectedDurationDays: spec.event.durationDays,
        affectedKeywords: [spec.event.type, spec.event.target],
        publishedAt: new Date().toISOString(),
        readerMode: 'offline-rule',
      };

      setPersisted((prev) => ({
        ...prev,
        persona: spec.persona,
        hasPickedWorld: true,
        isCustomShopActive: false,
        outerRingsDiscovered: true,
        graphsByPersona: {
          ...prev.graphsByPersona,
          [spec.persona]: freshGraph,
        },
        eventsByPersona: {
          ...prev.eventsByPersona,
          [spec.persona]: [
            troubleEvent,
            ...SAMPLE_NEWS_EVENTS[spec.persona].filter((e) => e.id !== troubleEvent.id),
          ],
        },
      }));
      setIsWorldPickerOpen(false);
      setSelectedEventId(troubleEvent.id);
      setActiveScenarioId(spec.id);
      pushAudit({
        actionName: `Load ${spec.shortLabel}`,
        description: spec.name,
        query:
          'MATCH path=(s:Supplier)-[:SUPPLIES*1..3]->(b:Business {id:$businessId}) RETURN s, path, $expected AS expectedResult',
        params: {
          businessId: freshGraph.business.id,
          scenarioId: spec.id,
          type: spec.event.type,
          target: spec.event.target,
          expected: spec.expectedSummary,
        },
      });
    },
    [pushAudit],
  );

  const triggerStoryNews = useCallback((draft: Omit<StoryNewsDraft, 'nonce'>) => {
    setStoryNewsDraft({ ...draft, nonce: Date.now() + Math.random() });
  }, []);

  const triggerStoryOrderExtraStock = useCallback((days: number) => {
    setStoryTryItExtraDays({ days, nonce: Date.now() + Math.random() });
  }, []);

  const triggerStoryShockPreset = useCallback((preset: Omit<StoryShockPreset, 'nonce'>) => {
    setStoryShockPreset({ ...preset, nonce: Date.now() + Math.random() });
  }, []);

  const clearStoryShockPreset = useCallback(() => {
    setStoryShockPreset(null);
  }, []);

  const updateSupplierStockDays = useCallback((supplierId: string, stockDays: number) => {
    const clampedDays = clamp(Math.round(stockDays), 1, 30);
    setPersisted((prev) => {
      const activeGraph = prev.graphsByPersona[prev.persona];
      const updatedSuppliers = activeGraph.suppliers.map((s) =>
        s.id === supplierId ? { ...s, stockDays: clampedDays } : s,
      );
      return {
        ...prev,
        shopBuilderConfig:
          prev.persona === 'shop'
            ? {
                ...prev.shopBuilderConfig,
                stockDaysBySupplierId: {
                  ...prev.shopBuilderConfig.stockDaysBySupplierId,
                  [supplierId]: clampedDays,
                },
              }
            : prev.shopBuilderConfig,
        graphsByPersona: {
          ...prev.graphsByPersona,
          [prev.persona]: {
            ...activeGraph,
            suppliers: updatedSuppliers,
          },
        },
      };
    });
  }, []);

  const analyzeNewsDraft = useCallback(
    async (params: {
      text: string;
      sourceType: SourceType;
      sourceName?: string;
      englishFallbackHint?: string;
    }) => {
      setIsReadingNews(true);
      try {
        const res = await deepTierService.analyzeNewsItem({
          text: params.text,
          sourceType: params.sourceType,
          sourceName: params.sourceName,
          englishFallbackHint: params.englishFallbackHint,
          uiLanguage: persisted.language,
          graph,
        });
        pushAudit(res.cypher);
        return res.data;
      } finally {
        setIsReadingNews(false);
      }
    },
    [graph, persisted.language, pushAudit],
  );

  const addAlerts = useCallback((newEvents: TroubleEvent[]) => {
    if (newEvents.length === 0) return;
    setPersisted((prev) => ({
      ...prev,
      eventsByPersona: {
        ...prev.eventsByPersona,
        [prev.persona]: [...newEvents, ...prev.eventsByPersona[prev.persona]],
      },
    }));
    setSelectedEventId(newEvents[0].id);
  }, []);

  const analyzeAndAddNews = useCallback(
    async (text: string, sourceType: SourceType, sourceName?: string) => {
      setIsReadingNews(true);
      try {
        const res = await deepTierService.readNewsWithFallback({
          text,
          sourceType,
          sourceName,
          uiLanguage: persisted.language,
          graph,
        });
        pushAudit(res.cypher);
        setPersisted((prev) => ({
          ...prev,
          eventsByPersona: {
            ...prev.eventsByPersona,
            [prev.persona]: [res.data, ...prev.eventsByPersona[prev.persona]],
          },
        }));
        setSelectedEventId(res.data.id);
        return res.data;
      } finally {
        setIsReadingNews(false);
      }
    },
    [graph, persisted.language, pushAudit],
  );

  const addSupplier = useCallback(
    (input: {
      name: string;
      itemSupplied: string;
      layer: SupplierLayer;
      city: string;
      stockDays: number;
      toId: string;
      sharePct: number;
      transitDays: number;
    }) => {
      const res = deepTierService.addSupplierAndLink(graph, input);
      pushAudit(res.cypher);
      setPersisted((prev) => ({
        ...prev,
        graphsByPersona: {
          ...prev.graphsByPersona,
          [prev.persona]: res.data,
        },
      }));
    },
    [graph, pushAudit],
  );

  const applyDiscoveredSuggestion = useCallback(
    (suggestionId: string) => {
      const suggestion = discoveryResult.data.find((s) => s.id === suggestionId);
      if (!suggestion) return;
      const res = deepTierService.addSupplierAndLink(graph, {
        name: suggestion.proposedSupplier.name,
        itemSupplied: suggestion.proposedSupplier.itemSupplied,
        layer: suggestion.proposedSupplier.layer,
        city: suggestion.proposedSupplier.city,
        stockDays: suggestion.proposedSupplier.stockDays,
        toId: suggestion.proposedLink.toId,
        sharePct: suggestion.proposedLink.sharePct,
        transitDays: suggestion.proposedLink.transitDays,
      });
      pushAudit(discoveryResult.cypher);
      setPersisted((prev) => ({
        ...prev,
        outerRingsDiscovered: true,
        graphsByPersona: {
          ...prev.graphsByPersona,
          [prev.persona]: res.data,
        },
      }));
    },
    [discoveryResult, graph, pushAudit],
  );

  const toggleActionCompleted = useCallback((actionId: string) => {
    setPersisted((prev) => {
      const exists = prev.completedActionIds.includes(actionId);
      return {
        ...prev,
        completedActionIds: exists
          ? prev.completedActionIds.filter((id) => id !== actionId)
          : [...prev.completedActionIds, actionId],
      };
    });
  }, []);

  const saveRunForCompare = useCallback((run: Omit<SavedComparisonRun, 'id'>) => {
    setPersisted((prev) => {
      const nextRun: SavedComparisonRun = {
        ...run,
        id: `run-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      };
      const updated = [nextRun, ...(prev.savedRuns ?? [])].slice(0, 3);
      return {
        ...prev,
        savedRuns: updated,
      };
    });
  }, []);

  const removeSavedRun = useCallback((id: string) => {
    setPersisted((prev) => ({
      ...prev,
      savedRuns: (prev.savedRuns ?? []).filter((r) => r.id !== id),
    }));
  }, []);

  const clearSavedRuns = useCallback(() => {
    setPersisted((prev) => ({
      ...prev,
      savedRuns: [],
    }));
  }, []);

  const resetDemoState = useCallback(() => {
    liveRequestNonceRef.current += 1;
    setLiveWorldError(null);
    setLiveWorldStatus('idle');
    const fresh: PersistedState = {
      persona: 'shop',
      language: persisted.language,
      theme: persisted.theme,
      hasPickedWorld: true,
      isCustomShopActive: false,
      shopBuilderConfig: DEFAULT_BUILDER_CONFIG,
      outerRingsDiscovered: false,
      graphsByPersona: {
        shop: getPersonaChainGraph('shop'),
        factory: getPersonaChainGraph('factory'),
      },
      eventsByPersona: {
        shop: [...SAMPLE_NEWS_EVENTS.shop],
        factory: [...SAMPLE_NEWS_EVENTS.factory],
      },
      liveWorldMetaByPersona: {},
      completedActionIds: [],
      savedRuns: [],
    };
    setPersisted(fresh);
    setSelectedEventId(null);
    setActiveScenarioId(null);
    setStoryNewsDraft(null);
    setStoryTryItExtraDays(null);
    setStoryShockPreset(null);
    setIsWorldPickerOpen(false);
  }, [persisted.language, persisted.theme]);

  const liveWorldMeta =
    persisted.liveWorldMetaByPersona?.[persisted.persona] ?? null;

  const value: DeepTierContextValue = {
    persona: persisted.persona,
    language: persisted.language,
    theme: persisted.theme,
    hasPickedWorld: persisted.hasPickedWorld,
    isWorldPickerOpen,
    isCustomShopActive: persisted.isCustomShopActive,
    shopBuilderConfig: persisted.shopBuilderConfig,
    outerRingsDiscovered: persisted.outerRingsDiscovered,
    t,
    judgesMode,
    setJudgesMode,
    setOuterRingsDiscovered,
    activeScenarioId,
    loadVerificationScenario,
    storyNewsDraft,
    triggerStoryNews,
    storyTryItExtraDays,
    triggerStoryOrderExtraStock,
    storyShockPreset,
    triggerStoryShockPreset,
    clearStoryShockPreset,
    graph,
    events,
    selectedEventId: selectedEventId ?? events[0]?.id ?? null,
    riskSummary: riskEvaluation.data,
    discoveredSuggestions: discoveryResult.data,
    auditHistory,
    selfTests: selfTestsResult.data,
    isReadingNews,
    liveWorldStatus,
    liveWorldError,
    liveWorldMeta,
    refreshLiveWorldAlerts,
    recordAudit: pushAudit,
    setPersona,
    selectDemoWorld,
    applyCustomShop,
    openWorldPicker,
    closeWorldPicker,
    setLanguage,
    toggleTheme,
    toggleJudgesMode,
    sharpenOuterRings,
    setSelectedEventId,
    updateSupplierStockDays,
    analyzeAndAddNews,
    analyzeNewsDraft,
    addAlerts,
    addSupplier,
    applyDiscoveredSuggestion,
    toggleActionCompleted,
    savedRuns: persisted.savedRuns ?? [],
    saveRunForCompare,
    removeSavedRun,
    clearSavedRuns,
    resetDemoState,
  };

  return <DeepTierContext.Provider value={value}>{children}</DeepTierContext.Provider>;
}

export function useDeepTier(): DeepTierContextValue {
  const ctx = useContext(DeepTierContext);
  if (!ctx) {
    throw new Error('useDeepTier must be used inside DeepTierProvider');
  }
  return ctx;
}
