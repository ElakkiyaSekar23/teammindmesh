import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  Eye,
  EyeOff,
  MapPin,
} from 'lucide-react';
import {
  RISK_FAMILIES,
  RISK_LIBRARY_ITEMS,
  type RiskFamilyId,
} from '../data/riskLibrary';
import {
  type AppRoute,
  type RiskEventType,
  type WhyExplanation,
} from '../engine';
import { useDeepTier } from '../state/store';
import { MapErrorBoundary, MapLoadingFallback } from '../components/MapErrorBoundary';
import { MetricTooltip } from '../components/MetricTooltip';
import { RingEmptyState, TrafficLightTag } from '../components/RingMotif';
import { RippleWorkbench } from '../components/RippleWorkbench';
import { RiskTypeIcon } from '../components/RiskTypeIcon';
import { SeasonWatchPanel } from '../components/SeasonWatchPanel';
import { ShockTestDrawer } from '../components/ShockTestDrawer';

const IndiaSupplyMap = lazy(() =>
  import('../components/IndiaSupplyMap').then((mod) => ({
    default: mod.IndiaSupplyMap,
  })),
);

interface RippleSectionProps {
  onExplain: (why: WhyExplanation) => void;
  onNavigate: (route: AppRoute) => void;
}

export function RippleSection({ onExplain, onNavigate }: RippleSectionProps) {
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    riskSummary,
    graph,
    storyShockPreset,
    clearStoryShockPreset,
    t,
  } = useDeepTier();

  const [selectedFamily, setSelectedFamily] = useState<RiskFamilyId | 'all'>('all');
  const [showIndiaMap, setShowIndiaMap] = useState<boolean>(false);

  const [shockType, setShockType] = useState<RiskEventType | null>(null);
  const [shockPreset, setShockPreset] = useState<{
    type: RiskEventType;
    target: string;
    severity: number;
    durationDays: number;
    pricePct?: number;
    autoRun?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!storyShockPreset) {
      setShockType(null);
      setShockPreset(null);
      return;
    }
    setShockType(storyShockPreset.type);
    setShockPreset({
      type: storyShockPreset.type,
      target: storyShockPreset.target,
      severity: storyShockPreset.severity,
      durationDays: storyShockPreset.durationDays,
      pricePct: storyShockPreset.pricePct,
      autoRun: storyShockPreset.autoRun,
    });
  }, [storyShockPreset]);

  const visibleFamilies = useMemo(
    () =>
      selectedFamily === 'all'
        ? RISK_FAMILIES
        : RISK_FAMILIES.filter((f) => f.id === selectedFamily),
    [selectedFamily],
  );

  const matchingImpacts = riskSummary.impacts.filter((imp) =>
    selectedEventId ? imp.eventId === selectedEventId : true,
  );
  const activeImpact = matchingImpacts[0] ?? riskSummary.impacts[0];

  const handleOpenCard = (type: RiskEventType) => {
    setShockPreset(null);
    setShockType(type);
  };

  const activeEvent = useMemo(
    () =>
      activeImpact
        ? (events.find((e) => e.id === activeImpact.eventId) ?? events[0])
        : undefined,
    [activeImpact, events],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
            Risk Library & Shock Test
          </h1>
          <p className="mt-1 text-base text-[var(--muted)] max-w-2xl">
            Pick any of the 18 supply troubles below to run a what-if check on{' '}
            <span className="text-[var(--text)] font-semibold">
              {graph.business.businessName}
            </span>
            .
          </p>
        </div>

        {activeImpact && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="#live-alert-ripple"
              className="min-h-[48px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--text)] hover:border-[var(--amber)]"
            >
              <ArrowDown className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
              <span>Live Ripple &amp; Compare</span>
            </a>
          </div>
        )}
      </div>

      {/* Season Watch Panel */}
      <SeasonWatchPanel onTestRisk={handleOpenCard} />

      {/* Family Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedFamily('all')}
          aria-pressed={selectedFamily === 'all'}
          className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            selectedFamily === 'all'
              ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
              : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          All 18 risks
        </button>
        {RISK_FAMILIES.map((fam) => {
          const active = selectedFamily === fam.id;
          return (
            <button
              key={fam.id}
              type="button"
              onClick={() => setSelectedFamily(fam.id)}
              aria-pressed={active}
              className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                active
                  ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                  : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {fam.label}
            </button>
          );
        })}
      </div>

      {/* 18 Risk Types Grouped in 8 Families */}
      <div className="space-y-6">
        {visibleFamilies.map((family) => {
          const items = RISK_LIBRARY_ITEMS.filter((item) => item.family === family.id);
          return (
            <section key={family.id} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-2">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
                    {family.label}
                  </h2>
                  <span className="text-xs sm:text-sm text-[var(--muted)]">
                    {family.subtitle}
                  </span>
                </div>
                <span className="font-mono text-xs text-[var(--muted)] tabular-nums">
                  {items.length} {items.length === 1 ? 'risk' : 'risks'}
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const isHidden = item.visibilityTag === 'Usually hidden';
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleOpenCard(item.type)}
                      className="instrument-panel instrument-ticks p-4 text-left flex flex-col justify-between gap-3 hover:border-[var(--amber)] transition-colors group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--amber)] group-hover:border-[var(--amber)]/60">
                              <RiskTypeIcon type={item.type} className="h-5 w-5" />
                            </div>
                            <h3 className="font-display text-base font-bold text-[var(--text)] leading-snug">
                              {item.plainTitle}
                            </h3>
                          </div>
                        </div>

                        <p className="text-sm text-[var(--text)]/90 leading-relaxed">
                          {item.everydayExample}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${
                            isHidden
                              ? 'border-[var(--ember)]/40 bg-[var(--ember)]/10 text-[var(--ember)]'
                              : 'border-[var(--blue)]/40 bg-[var(--blue)]/10 text-[var(--blue)]'
                          }`}
                          title={`Hidden or visible? ${item.visibilityHint}`}
                        >
                          {isHidden ? (
                            <EyeOff className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Eye className="h-3 w-3" aria-hidden="true" />
                          )}
                          <span>Hidden or visible?: {item.visibilityTag}</span>
                        </span>

                        <span className="font-semibold text-[var(--amber)] shrink-0">
                          Run shock →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Live Alert Ripples Section (tracks active alerts from Today / News) */}
      <section
        id="live-alert-ripple"
        className="space-y-5 border-t border-[var(--line)] pt-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text)]">
              {t.sections.rippleHeading}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-[var(--muted)] max-w-2xl">
              {t.sections.rippleSub}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('actions')}
            className="min-h-[44px] rounded-xl border border-[var(--amber)] bg-[var(--amber)]/10 px-4 py-2 text-xs sm:text-sm font-bold text-[var(--amber)] hover:bg-[var(--amber)]/20 shrink-0"
          >
            {t.sections.actionsHeading}
          </button>
        </div>

        {!activeImpact || !activeEvent ? (
          <RingEmptyState
            title="No active ripples from news"
            subtitle={t.sections.noTroublesYet}
            actionLabel={t.nav.newsWatch}
            onAction={() => onNavigate('news-watch')}
          />
        ) : (
          <div className="space-y-5">
            {/* Event switcher tabs */}
            <div className="flex flex-wrap gap-2">
              {events.map((ev) => {
                const active = ev.id === activeImpact.eventId;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold text-left transition-colors ${
                      active
                        ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                        : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {ev.title}
                    {ev.verifiedStatus === 'unverified'
                      ? ` (${t.controls.unverifiedBadge})`
                      : ''}
                  </button>
                );
              })}
            </div>

            {/* Active alert banner + India Map Toggle */}
            <div className="instrument-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <TrafficLightTag level={activeImpact.alertLevel} />
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                    <span>
                      {activeImpact.sourceSupplierName} · {activeImpact.pathDependencyPct}% of
                      your supply flows here
                    </span>
                    <MetricTooltip
                      label={t.ui.supplyShareLabel}
                      explanation={t.metricTooltips.supplyShare}
                    />
                  </span>
                </div>
                <p className="text-base text-[var(--text)] font-medium">
                  {activeImpact.recommendedAction}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowIndiaMap((v) => !v)}
                aria-pressed={showIndiaMap}
                className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold shrink-0 transition-colors ${
                  showIndiaMap
                    ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
                    : 'border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{showIndiaMap ? 'Hide India Map' : 'India Map & Reach (0–30d)'}</span>
              </button>
            </div>

            {showIndiaMap && (
              <MapErrorBoundary
                title={t.ui.mapLoadError}
                retryLabel={t.ui.tryAgain}
              >
                <Suspense fallback={<MapLoadingFallback label={t.ui.loadingMap} />}>
                  <IndiaSupplyMap
                    graph={graph}
                    events={events}
                    selectedEventId={activeEvent.id}
                    onSelectEventId={setSelectedEventId}
                  />
                </Suspense>
              </MapErrorBoundary>
            )}

            {/* Interactive Ripple Workbench (Animation, Day-by-Day Chart, Try-It, Best/Likely/Worst, Compare) */}
            <RippleWorkbench
              key={activeEvent.id}
              graph={graph}
              event={activeEvent}
              baseImpact={activeImpact}
              onExplain={onExplain}
            />
          </div>
        )}
      </section>

      {/* Shock Test Drawer */}
      <ShockTestDrawer
        initialType={shockType}
        initialPreset={shockPreset}
        onClose={() => {
          setShockType(null);
          setShockPreset(null);
          clearStoryShockPreset();
        }}
        onExplain={onExplain}
        onNavigateActions={() => onNavigate('actions')}
      />
    </motion.div>
  );
}
