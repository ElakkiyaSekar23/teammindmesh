import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  List,
  MapPin,
  Play,
  TrendingUp,
  X,
} from 'lucide-react';
import { INDIA_GAZETTEER } from '../data/gazetteer';
import {
  buildShockTroubleEvent,
  getRiskLibraryItem,
  RISK_FAMILIES,
} from '../data/riskLibrary';
import {
  computeChainRiskSummary,
  formatInr,
  simulateEventRipple,
  type ActionItem,
  type RippleImpact,
  type RiskEventType,
  type TroubleEvent,
  type WhyExplanation,
} from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';
import { DaysLeftClock } from './DaysLeftClock';
import { MapErrorBoundary, MapLoadingFallback } from './MapErrorBoundary';
import { RingEmptyState, TrafficLightTag } from './RingMotif';
import { RippleWorkbench } from './RippleWorkbench';
import { RiskTypeIcon } from './RiskTypeIcon';

const ShockTestMap = lazy(() =>
  import('./ShockTestMap').then((mod) => ({
    default: mod.ShockTestMap,
  })),
);

interface ShockTestDrawerProps {
  initialType: RiskEventType | null;
  initialPreset?: {
    type: RiskEventType;
    target: string;
    severity: number;
    durationDays: number;
    pricePct?: number;
    autoRun?: boolean;
  } | null;
  onClose: () => void;
  onExplain: (why: WhyExplanation) => void;
  onNavigateActions: () => void;
}

const SEVERITY_LEVELS = [
  { label: 'Small', value: 0.2, pricePct: 10, hint: 'Minor' },
  { label: 'Medium', value: 0.4, pricePct: 20, hint: 'Moderate' },
  { label: 'Big', value: 0.6, pricePct: 30, hint: 'Serious' },
  { label: 'Huge', value: 0.9, pricePct: 45, hint: 'Severe' },
] as const;

export function ShockTestDrawer({
  initialType,
  initialPreset,
  onClose,
  onExplain,
  onNavigateActions,
}: ShockTestDrawerProps) {
  const { graph, recordAudit, t } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [riskType, setRiskType] = useState<RiskEventType>(
    initialPreset?.type ?? initialType ?? 'flood',
  );
  const libItem = useMemo(() => getRiskLibraryItem(riskType), [riskType]);
  const familyMeta = useMemo(
    () => RISK_FAMILIES.find((f) => f.id === libItem.family),
    [libItem.family],
  );

  // Derive realistic default target whenever riskType or world changes
  const defaultTargetForType = useMemo(() => {
    const sup =
      graph.suppliers.find((s) => s.layer >= 2 && s.isSingleSource) ??
      graph.suppliers.find((s) => s.layer >= 2) ??
      graph.suppliers[0];

    if (libItem.targetCategory === 'single_supplier') {
      return sup?.id ?? '';
    }
    if (libItem.targetCategory === 'material') {
      return sup?.group ?? graph.suppliers[0]?.group ?? '';
    }
    return sup?.city ?? graph.business.city;
  }, [graph.business.city, graph.suppliers, libItem.targetCategory]);

  const [target, setTarget] = useState<string>(
    initialPreset?.target ?? defaultTargetForType,
  );
  const [severity, setSeverity] = useState<number>(initialPreset?.severity ?? 0.6);
  const [durationDays, setDurationDays] = useState<number>(
    initialPreset?.durationDays ?? 12,
  );
  const [priceRisePct, setPriceRisePct] = useState<number>(
    initialPreset?.pricePct ? Math.round(initialPreset.pricePct * 100) : 30,
  );
  const [whereTab, setWhereTab] = useState<'map' | 'list'>('map');
  const [runCounter, setRunCounter] = useState<number>(0);
  const [testedEvent, setTestedEvent] = useState<TroubleEvent | null>(null);
  const [impacts, setImpacts] = useState<RippleImpact[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [completedLocalIds, setCompletedLocalIds] = useState<Record<string, boolean>>({});

  const resultSectionRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sync when opening a new card or preset
  useEffect(() => {
    const nextType = initialPreset?.type ?? initialType;
    if (!nextType) return;
    setRiskType(nextType);
    const item = getRiskLibraryItem(nextType);
    const sup =
      graph.suppliers.find((s) => s.layer >= 2 && s.isSingleSource) ??
      graph.suppliers.find((s) => s.layer >= 2) ??
      graph.suppliers[0];
    const fallbackTarget =
      item.targetCategory === 'single_supplier'
        ? (sup?.id ?? '')
        : item.targetCategory === 'material'
          ? (sup?.group ?? '')
          : (sup?.city ?? graph.business.city);

    const nextTarget = initialPreset?.target ?? fallbackTarget;
    const nextSeverity = initialPreset?.severity ?? 0.6;
    const nextDuration = initialPreset?.durationDays ?? 12;
    const nextPricePct = initialPreset?.pricePct
      ? Math.round(initialPreset.pricePct * 100)
      : 30;

    setTarget(nextTarget);
    setSeverity(nextSeverity);
    setDurationDays(nextDuration);
    setPriceRisePct(nextPricePct);

    if (initialPreset?.autoRun) {
      const ev = buildShockTroubleEvent(graph, {
        type: nextType,
        target: nextTarget,
        severity: nextSeverity,
        durationDays: nextDuration,
        pricePct: item.isPriceType ? nextPricePct / 100 : undefined,
      });
      const resImpacts = simulateEventRipple(graph, ev);
      const summary = computeChainRiskSummary(graph, [ev]);
      setTestedEvent(ev);
      setImpacts(resImpacts);
      setActions(summary.actions);
      setRunCounter((c) => c + 1);
    } else {
      setTestedEvent(null);
      setImpacts([]);
      setActions([]);
    }
  }, [initialPreset, initialType, graph]);

  // Close on Escape and move initial focus into dialog
  useEffect(() => {
    if (!initialType && !initialPreset) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [initialPreset, initialType, onClose]);

  // Unique choices for "Where" list
  const cityOptions = useMemo(() => {
    const map = new Map<string, { city: string; fromChain: boolean; hint: string }>();
    for (const s of graph.suppliers) {
      if (!map.has(s.city)) {
        map.set(s.city, {
          city: s.city,
          fromChain: true,
          hint: `Layer ${s.layer} · ${s.itemSupplied}`,
        });
      }
    }
    for (const p of INDIA_GAZETTEER) {
      if (!map.has(p.name) && map.size < 16) {
        map.set(p.name, { city: p.name, fromChain: false, hint: p.state });
      }
    }
    return Array.from(map.values());
  }, [graph.suppliers]);

  const materialOptions = useMemo(() => {
    const map = new Map<string, { group: string; sampleItem: string; cities: string[] }>();
    for (const s of graph.suppliers) {
      const existing = map.get(s.group);
      if (existing) {
        if (!existing.cities.includes(s.city)) existing.cities.push(s.city);
      } else {
        map.set(s.group, {
          group: s.group,
          sampleItem: s.itemSupplied,
          cities: [s.city],
        });
      }
    }
    return Array.from(map.values());
  }, [graph.suppliers]);

  if (!initialType && !initialPreset) return null;

  const executeShockTest = (overrides?: {
    type?: RiskEventType;
    target?: string;
    severity?: number;
    durationDays?: number;
    priceRisePct?: number;
  }) => {
    const activeType = overrides?.type ?? riskType;
    const item = getRiskLibraryItem(activeType);
    const activeTarget = overrides?.target ?? target;
    const activeSeverity = overrides?.severity ?? severity;
    const activeDuration = overrides?.durationDays ?? (item.isPriceType ? 21 : durationDays);
    const activeRise = overrides?.priceRisePct ?? priceRisePct;

    const ev = buildShockTroubleEvent(graph, {
      type: activeType,
      target: activeTarget,
      severity: activeSeverity,
      durationDays: activeDuration,
      pricePct: item.isPriceType ? activeRise / 100 : undefined,
    });

    const nextImpacts = simulateEventRipple(graph, ev);
    const summary = computeChainRiskSummary(graph, [ev]);

    setTestedEvent(ev);
    setImpacts(nextImpacts);
    setActions(summary.actions);
    setRunCounter((c) => c + 1);

    recordAudit({
      actionName: 'Shock Test Simulation',
      description: `What-if check for ${item.plainTitle} targeting ${activeTarget}`,
      query:
        item.targetCategory === 'place'
          ? 'MATCH path=(s:Supplier)-[:SUPPLIES*1..3]->(b:Business {id:$businessId}) WHERE s.city = $target OR point.distance(...) RETURN path'
          : item.targetCategory === 'material'
            ? 'MATCH path=(s:Supplier {group:$target})-[:SUPPLIES*1..3]->(b:Business {id:$businessId}) RETURN path'
            : 'MATCH path=(s:Supplier {id:$target})-[:SUPPLIES*1..3]->(b:Business {id:$businessId}) RETURN path',
      params: {
        businessId: graph.business.id,
        riskType: activeType,
        target: activeTarget,
        severity: ev.severity,
        durationDays: ev.durationDays,
      },
    });

    window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }, 80);
  };

  const topImpact = impacts[0];

  // Supplemental Do-this-today checklist combining engine action + alternate vendor tip
  const affectedSup = topImpact
    ? graph.suppliers.find((s) => s.id === topImpact.sourceSupplierId)
    : undefined;
  const doTodaySteps = useMemo(() => {
    if (!topImpact) return [];
    const list: Array<{ id: string; title: string; detail: string; saveInr?: number }> = [];
    actions.forEach((a) => {
      list.push({
        id: a.id,
        title: a.title,
        detail: a.plainReason,
        saveInr: a.potentialSavingsInr,
      });
    });
    if (affectedSup && affectedSup.alternateSuppliers.length > 0) {
      list.push({
        id: `alt-${affectedSup.id}`,
        title: `Call backup vendor: ${affectedSup.alternateSuppliers[0]}`,
        detail: `Ask for emergency delivery to replace ${affectedSup.itemSupplied} from ${affectedSup.city}.`,
      });
    }
    if (topImpact.assessment.exposedDays > 0 && affectedSup) {
      list.push({
        id: `stock-${affectedSup.id}`,
        title: `Raise stock cushion on ${affectedSup.itemSupplied} by ${Math.min(7, topImpact.assessment.exposedDays)} days`,
        detail: `Your chain currently holds ${topImpact.daysToImpact} days before impact.`,
      });
    }
    return list;
  }, [actions, affectedSup, topImpact]);

  const activeSeverityIndex = SEVERITY_LEVELS.reduce((bestIdx, curr, idx) => {
    const targetVal = libItem.isPriceType ? priceRisePct : severity;
    const currVal = libItem.isPriceType ? curr.pricePct : curr.value;
    const bestVal = libItem.isPriceType
      ? SEVERITY_LEVELS[bestIdx].pricePct
      : SEVERITY_LEVELS[bestIdx].value;
    return Math.abs(currVal - targetVal) < Math.abs(bestVal - targetVal)
      ? idx
      : bestIdx;
  }, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shock-test-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="instrument-panel instrument-ticks w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--amber)]">
              <RiskTypeIcon type={riskType} className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[var(--amber)]">
                  Shock Test · {familyMeta?.label ?? 'Risk'}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-semibold ${
                    libItem.visibilityTag === 'Usually hidden'
                      ? 'border-[var(--ember)]/40 bg-[var(--ember)]/10 text-[var(--ember)]'
                      : 'border-[var(--blue)]/40 bg-[var(--blue)]/10 text-[var(--blue)]'
                  }`}
                >
                  {libItem.visibilityTag}
                </span>
              </div>
              <h2
                id="shock-test-title"
                className="font-display text-xl sm:text-2xl font-bold text-[var(--text)]"
              >
                {libItem.plainTitle}
              </h2>
              <p className="text-sm text-[var(--muted)]">{libItem.everydayExample}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={t.controls.close}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* 1. Where (Map or City/Target List) */}
          <div className="lg:col-span-6 instrument-panel-raised p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text)]">
                  1. Where does it hit?
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {libItem.targetCategory === 'place'
                    ? 'Pick a city on the map or from the list.'
                    : libItem.targetCategory === 'material'
                      ? 'Pick which supplied item or city hub is squeezed.'
                      : 'Pick which vendor in your chain stops running.'}
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--navy)] p-1">
                <button
                  type="button"
                  onClick={() => setWhereTab('map')}
                  aria-pressed={whereTab === 'map'}
                  className={`min-h-[44px] inline-flex items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    whereTab === 'map'
                      ? 'bg-[var(--amber)] text-[var(--amber-ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWhereTab('list')}
                  aria-pressed={whereTab === 'list'}
                  className={`min-h-[44px] inline-flex items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    whereTab === 'list'
                      ? 'bg-[var(--amber)] text-[var(--amber-ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {whereTab === 'map' ? (
              <div className="space-y-2">
                <MapErrorBoundary
                  title={t.ui.mapLoadError}
                  retryLabel={t.ui.tryAgain}
                  heightClass="min-h-[240px]"
                >
                  <Suspense
                    fallback={
                      <MapLoadingFallback label={t.ui.loadingMap} heightClass="min-h-[240px]" />
                    }
                  >
                    <ShockTestMap
                      graph={graph}
                      selectedCityOrId={target}
                      selectionMode={
                        libItem.targetCategory === 'place'
                          ? 'city'
                          : libItem.targetCategory === 'single_supplier'
                            ? 'supplier'
                            : 'group'
                      }
                      selectedGroup={libItem.targetCategory === 'material' ? target : undefined}
                      onSelectCity={(city) => setTarget(city)}
                      onSelectSupplierId={(supId) => setTarget(supId)}
                      onSelectGroup={(grp) => setTarget(grp)}
                    />
                  </Suspense>
                </MapErrorBoundary>
                <div className="text-xs text-[var(--muted)]">
                  Selected:{' '}
                  <strong className="text-[var(--amber)]">
                    {libItem.targetCategory === 'single_supplier'
                      ? (graph.suppliers.find((s) => s.id === target)?.name ?? target)
                      : target}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="max-h-[250px] overflow-y-auto pr-1 space-y-1.5">
                {libItem.targetCategory === 'place' &&
                  cityOptions.map((opt) => {
                    const active = opt.city.toLowerCase() === target.toLowerCase();
                    return (
                      <button
                        key={opt.city}
                        type="button"
                        onClick={() => setTarget(opt.city)}
                        aria-pressed={active}
                        className={`w-full min-h-[44px] flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                          active
                            ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                            : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span className="font-semibold text-[var(--text)]">{opt.city}</span>
                        <span className="text-[11px] truncate max-w-[190px]">{opt.hint}</span>
                      </button>
                    );
                  })}

                {libItem.targetCategory === 'material' &&
                  materialOptions.map((opt) => {
                    const active = opt.group.toLowerCase() === target.toLowerCase();
                    return (
                      <button
                        key={opt.group}
                        type="button"
                        onClick={() => setTarget(opt.group)}
                        aria-pressed={active}
                        className={`w-full min-h-[44px] flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                          active
                            ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                            : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span>
                          <strong className="capitalize text-[var(--text)]">{opt.group}</strong>{' '}
                          <span className="text-[var(--muted)]">({opt.sampleItem})</span>
                        </span>
                        <span className="text-[11px]">{opt.cities.join(', ')}</span>
                      </button>
                    );
                  })}

                {libItem.targetCategory === 'single_supplier' &&
                  graph.suppliers.map((sup) => {
                    const active = sup.id === target;
                    return (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => setTarget(sup.id)}
                        aria-pressed={active}
                        className={`w-full min-h-[44px] flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                          active
                            ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                            : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[var(--text)]">{sup.name}</div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {sup.city} · Layer {sup.layer} · {sup.itemSupplied}
                          </div>
                        </div>
                        {sup.isSingleSource && (
                          <span className="text-[11px] font-semibold text-[var(--ember)] shrink-0">
                            No backup
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 2. How serious + 3. How long / % rise */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            <div className="instrument-panel-raised p-4 space-y-3">
              <h3 className="font-display text-base font-bold text-[var(--text)]">
                2. How serious?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_LEVELS.map((lvl, idx) => {
                  const active = idx === activeSeverityIndex;
                  return (
                    <button
                      key={lvl.label}
                      type="button"
                      onClick={() => {
                        setSeverity(lvl.value);
                        if (libItem.isPriceType) {
                          setPriceRisePct(lvl.pricePct);
                        }
                      }}
                      aria-pressed={active}
                      className={`min-h-[54px] rounded-xl border px-3 py-2 text-center transition-colors ${
                        active
                          ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                          : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="text-sm font-bold text-[var(--text)]">{lvl.label}</div>
                      <div className="font-mono text-[11px] text-[var(--muted)]">
                        {libItem.isPriceType ? `+${lvl.pricePct}%` : lvl.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration days OR Price % rise slider */}
            <div className="instrument-panel-raised p-4 space-y-3">
              {libItem.isPriceType ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[var(--text)] inline-flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
                      <span>3. How much price rise?</span>
                    </h3>
                    <span className="font-mono text-xl font-bold text-[var(--amber)] tabular-nums">
                      +{priceRisePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={priceRisePct}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      setPriceRisePct(pct);
                      setSeverity(Math.min(1, pct / 50));
                    }}
                    aria-label="Price rise percentage slider"
                    className="deeptier-range w-full"
                  />
                  <div className="flex justify-between font-mono text-[11px] text-[var(--muted)]">
                    <span>+5% mild</span>
                    <span>+25% sharp</span>
                    <span>+50%+ extreme</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[var(--text)]">
                      3. How long could it last?
                    </h3>
                    <span className="font-mono text-xl font-bold text-[var(--amber)] tabular-nums">
                      {durationDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    aria-label="Trouble duration in days slider"
                    className="deeptier-range w-full"
                  />
                  <div className="flex justify-between font-mono text-[11px] text-[var(--muted)]">
                    <span>1 day</span>
                    <span>15 days</span>
                    <span>30 days</span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => executeShockTest()}
              className="min-h-[54px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--amber)] px-6 py-3 text-base font-bold text-[var(--amber-ink)] hover:brightness-105 active:scale-[0.99] transition-transform"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>What would happen to me?</span>
            </button>
          </div>
        </div>

        {/* Result Output */}
        {testedEvent && (
          <div
            ref={resultSectionRef}
            data-spotlight="shock-test-result"
            className="space-y-5 border-t border-[var(--line)] pt-5"
          >
            {topImpact ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
                      Shock Test Result
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--muted)]">
                      {testedEvent.plainSummary}
                    </p>
                  </div>
                  <TrafficLightTag level={topImpact.alertLevel} />
                </div>

                {/* Days-Left Clock */}
                <DaysLeftClock
                  impact={topImpact}
                  event={testedEvent}
                  onExplain={onExplain}
                  onPrimaryAction={() => {
                    onClose();
                    onNavigateActions();
                  }}
                  primaryActionLabel="Open Action Plan"
                />

                {/* Full Interactive Ripple Workbench */}
                <RippleWorkbench
                  key={`${testedEvent.id}-${runCounter}`}
                  graph={graph}
                  event={testedEvent}
                  baseImpact={topImpact}
                  onExplain={onExplain}
                />

                {/* Do-this-today list */}
                <div className="space-y-3">
                  <h4 className="font-display text-base font-bold text-[var(--text)]">
                    {t.controls.doThisToday}
                  </h4>
                  <div className="space-y-2.5">
                    {doTodaySteps.map((step) => {
                      const done = Boolean(completedLocalIds[step.id]);
                      return (
                        <div
                          key={step.id}
                          className="instrument-panel-raised p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-sm sm:text-base font-semibold text-[var(--text)]">
                              {step.title}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {step.detail}
                              {step.saveInr && step.saveInr > 0 ? (
                                <>
                                  {' '}
                                  · Save up to{' '}
                                  <span className="font-mono font-semibold text-[var(--teal)]">
                                    {formatInr(step.saveInr)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCompletedLocalIds((prev) => ({
                                ...prev,
                                [step.id]: !prev[step.id],
                              }))
                            }
                            aria-pressed={done}
                            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-bold shrink-0 transition-colors ${
                              done
                                ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                                : 'border-[var(--line)] bg-[var(--navy)] text-[var(--text)] hover:border-[var(--amber)]'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>{done ? 'Practised' : 'Try this step'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <RingEmptyState
                title={`No supplier touched near ${testedEvent.region}`}
                subtitle="This trouble is too far away from your current supply cities (closeness under 15%). Pick another supplier city on the map or list."
                actionLabel="Browse city list"
                onAction={() => setWhereTab('list')}
              />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
