import React, { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import {
  simulateEventRipple,
  type RippleImpact,
  type SupplyChainGraph,
  type TroubleEvent,
  type WhyExplanation,
} from '../engine';
import { useDeepTier } from '../state/store';
import { ImpactChart } from './ImpactChart';
import { MetricTooltip } from './MetricTooltip';
import { TrafficLightTag } from './RingMotif';
import { RippleChainCanvas } from './RippleChainCanvas';

interface RippleWorkbenchProps {
  graph: SupplyChainGraph;
  event: TroubleEvent;
  baseImpact: RippleImpact;
  onExplain?: (why: WhyExplanation) => void;
}

function formatRs(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function RippleWorkbench({
  graph,
  event,
  baseImpact,
  onExplain,
}: RippleWorkbenchProps) {
  const { savedRuns, saveRunForCompare, removeSavedRun, clearSavedRuns, storyTryItExtraDays, t } =
    useDeepTier();

  const [extraStockDays, setExtraStockDays] = useState<number>(0);
  const [useBackupSupplier, setUseBackupSupplier] = useState<boolean>(false);

  useEffect(() => {
    if (storyTryItExtraDays) {
      setExtraStockDays(storyTryItExtraDays.days);
    }
  }, [storyTryItExtraDays]);

  // Build modified graph and re-run deterministic engine live when try-it controls change
  const activeImpact = useMemo<RippleImpact>(() => {
    if (extraStockDays === 0 && !useBackupSupplier) {
      return baseImpact;
    }

    const chainIds = new Set(
      baseImpact.path
        .filter((step) => step.layer !== 0)
        .map((step) => step.supplierId),
    );
    const layer1Id =
      baseImpact.path[baseImpact.path.length - 2]?.supplierId ??
      baseImpact.sourceSupplierId;

    const modifiedGraph: SupplyChainGraph = {
      business: graph.business,
      links: graph.links.map((lnk) =>
        useBackupSupplier && chainIds.has(lnk.fromId)
          ? { ...lnk, substitutable: true, sharePct: Math.min(lnk.sharePct, 60) }
          : lnk,
      ),
      suppliers: graph.suppliers.map((sup) => {
        let next = sup;
        if (sup.id === layer1Id && extraStockDays > 0) {
          next = { ...next, stockDays: next.stockDays + extraStockDays };
        }
        if (useBackupSupplier && chainIds.has(sup.id)) {
          next = {
            ...next,
            isSingleSource: false,
            alternativesCount: Math.max(1, next.alternativesCount),
            stockDays: next.isSingleSource ? next.stockDays + 2 : next.stockDays,
          };
        }
        return next;
      }),
    };

    const reEvaluated = simulateEventRipple(modifiedGraph, event);
    return (
      reEvaluated.find((imp) => imp.sourceSupplierId === baseImpact.sourceSupplierId) ??
      reEvaluated[0] ??
      baseImpact
    );
  }, [baseImpact, event, extraStockDays, graph, useBackupSupplier]);

  const savedInr = Math.max(0, baseImpact.costAtRiskInr - activeImpact.costAtRiskInr);
  const hasTryItChanges = extraStockDays > 0 || useBackupSupplier;

  const sim = activeImpact.simulation;
  const maxMoney = Math.max(1, sim.worstCase.moneyAtRisk);
  const confidenceBars = [
    {
      label: t.ui.bestCase,
      money: sim.bestCase.moneyAtRisk,
      days: sim.bestCase.exposedDays,
      color: 'var(--teal)',
    },
    {
      label: t.ui.likelyCase,
      money: sim.likelyCase.moneyAtRisk,
      days: sim.likelyCase.exposedDays,
      color: 'var(--amber)',
    },
    {
      label: t.ui.worstCase,
      money: sim.worstCase.moneyAtRisk,
      days: sim.worstCase.exposedDays,
      color: 'var(--ember)',
    },
  ];

  const handleSaveRun = () => {
    const labelParts: string[] = [];
    if (extraStockDays > 0) labelParts.push(`+${extraStockDays}d stock`);
    if (useBackupSupplier) labelParts.push('Backup ON');
    const label = labelParts.length > 0 ? labelParts.join(' · ') : 'Current baseline';

    saveRunForCompare({
      label,
      eventTitle: event.title,
      supplierName: activeImpact.sourceSupplierName,
      extraStockDays,
      useBackupSupplier,
      daysToImpact: activeImpact.daysToImpact,
      exposedDays: activeImpact.assessment.exposedDays,
      moneyAtRisk: activeImpact.costAtRiskInr,
      savedInr,
      riskScore: activeImpact.riskScore,
      alertLevel: activeImpact.alertLevel,
      bestMoney: sim.bestCase.moneyAtRisk,
      likelyMoney: sim.likelyCase.moneyAtRisk,
      worstMoney: sim.worstCase.moneyAtRisk,
    });
  };

  return (
    <div data-spotlight="ripple-workbench" className="space-y-5">
      {/* Stone-in-water Ripple Animation + Day-by-Day Stock Timeline beside each other */}
      <div className="grid gap-4 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-7">
          <RippleChainCanvas impact={activeImpact} />
        </div>
        <div className="xl:col-span-5">
          <ImpactChart
            impact={baseImpact}
            tryItImpact={hasTryItChanges ? activeImpact : null}
            durationDays={event.durationDays}
          />
        </div>
      </div>

      {/* Output Cards in Simple Words + Risk Traffic Light */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="instrument-panel instrument-ticks p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
              <span>Arrival countdown</span>
              <MetricTooltip
                label={t.metrics.daysLeftTitle}
                explanation={t.metricTooltips.daysUntilHits}
                align="left"
              />
            </span>
            {onExplain && (
              <button
                type="button"
                onClick={() => onExplain(activeImpact.whyByMetric.daysToImpact)}
                className="min-h-[44px] -my-2 inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--amber)] hover:bg-[var(--panel)]"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.controls.whyButton}</span>
              </button>
            )}
          </div>
          <div className="mt-1.5 font-display text-lg sm:text-xl font-bold text-[var(--text)]">
            Hurts you in{' '}
            <span className="font-mono text-2xl text-[var(--amber)] tabular-nums">
              {activeImpact.daysToImpact}
            </span>{' '}
            {activeImpact.daysToImpact === 1 ? 'day' : 'days'}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Stock & transit days from {activeImpact.sourceSupplierName} to your door.
          </p>
        </div>

        <div className="instrument-panel instrument-ticks p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
              <span>{t.ui.exposedGapLabel}</span>
              <MetricTooltip
                label={t.ui.shortageDaysLabel}
                explanation={t.metricTooltips.shortageDays}
              />
            </span>
            {onExplain && (
              <button
                type="button"
                onClick={() => onExplain(activeImpact.whyByMetric.chanceOfRunningOutPct)}
                className="min-h-[44px] -my-2 inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--amber)] hover:bg-[var(--panel)]"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.controls.whyButton}</span>
              </button>
            )}
          </div>
          <div className="mt-1.5 font-display text-lg sm:text-xl font-bold text-[var(--text)]">
            You may run short for{' '}
            <span
              className="font-mono text-2xl tabular-nums"
              style={{
                color:
                  activeImpact.assessment.exposedDays > 0
                    ? 'var(--risk-urgent)'
                    : 'var(--teal)',
              }}
            >
              {activeImpact.assessment.exposedDays}
            </span>{' '}
            {activeImpact.assessment.exposedDays === 1 ? 'day' : 'days'}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Trouble could last {event.durationDays} days ({activeImpact.chanceOfRunningOutPct}%
            run-out chance).
          </p>
        </div>

        <div className="instrument-panel instrument-ticks p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
              <span>{t.metrics.moneyAtRiskTitle}</span>
              <MetricTooltip
                label={t.metrics.moneyAtRiskTitle}
                explanation={t.metricTooltips.moneyAtRisk}
              />
            </span>
            {onExplain && (
              <button
                type="button"
                onClick={() => onExplain(activeImpact.whyByMetric.costAtRiskInr)}
                className="min-h-[44px] -my-2 inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--amber)] hover:bg-[var(--panel)]"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.controls.whyButton}</span>
              </button>
            )}
          </div>
          <div className="mt-1.5 font-display text-lg font-bold text-[var(--text)]">
            {t.metrics.moneyAtRiskTitle}:{' '}
            <span className="block font-mono text-2xl text-[var(--ember)] tabular-nums mt-0.5">
              {formatRs(activeImpact.costAtRiskInr)}
            </span>
          </div>
          {hasTryItChanges && savedInr > 0 && (
            <p className="mt-1 font-mono text-xs font-bold text-[var(--teal)]">
              Down from {formatRs(baseImpact.costAtRiskInr)}
            </p>
          )}
        </div>

        <div className="instrument-panel instrument-ticks p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
              <span>Risk traffic light</span>
              <MetricTooltip
                label="Risk score"
                explanation={t.metricTooltips.riskScore}
                align="right"
              />
            </span>
            {onExplain && (
              <button
                type="button"
                onClick={() => onExplain(activeImpact.whyByMetric.riskScore)}
                className="min-h-[44px] -my-2 inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--amber)] hover:bg-[var(--panel)]"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.controls.whyButton}</span>
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <TrafficLightTag level={activeImpact.alertLevel} />
            <span className="font-mono text-xl font-bold text-[var(--text)] tabular-nums">
              {activeImpact.riskScore}/100
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {activeImpact.recommendedAction}
          </p>
        </div>
      </div>

      {/* Two "Try It" Controls + Three-bar Best / Likely / Worst */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Try It Controls */}
        <div
          data-spotlight="ripple-try-it"
          className="lg:col-span-6 instrument-panel instrument-ticks p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
              <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text)]">
                Try it: see how much you save
              </h3>
            </div>
            {hasTryItChanges && (
              <button
                type="button"
                onClick={() => {
                  setExtraStockDays(0);
                  setUseBackupSupplier(false);
                }}
                className="min-h-[44px] inline-flex items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Control 1: Slider Add extra stock days (0-15) */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label htmlFor="extra-stock-slider" className="font-semibold text-[var(--text)]">
                Add extra stock days (0-15)
              </label>
              <span className="font-mono text-base font-bold text-[var(--amber)] tabular-nums">
                +{extraStockDays} {extraStockDays === 1 ? 'day' : 'days'}
              </span>
            </div>
            <input
              id="extra-stock-slider"
              type="range"
              min={0}
              max={15}
              step={1}
              value={extraStockDays}
              onChange={(e) => setExtraStockDays(Number(e.target.value))}
              className="deeptier-range w-full"
            />
            <div className="flex items-center justify-between gap-2 pt-1 font-mono text-[11px] text-[var(--muted)]">
              <span>0 days</span>
              <button
                type="button"
                onClick={() => setExtraStockDays(5)}
                className={`min-h-[44px] rounded-lg border px-3 font-sans text-xs font-bold transition-colors ${
                  extraStockDays === 5
                    ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                    : 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)] hover:bg-[var(--amber)]/25'
                }`}
              >
                Order extra stock (+5d)
              </button>
              <span>+15 days</span>
            </div>
          </div>

          {/* Control 2: Switch Use a backup supplier */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                Use a backup supplier
              </div>
              <div className="text-xs text-[var(--muted)]">
                Splits supply with an alternate vendor so one stoppage does not stop you.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useBackupSupplier}
              aria-label="Use a backup supplier"
              onClick={() => setUseBackupSupplier((prev) => !prev)}
              className="min-h-[44px] inline-flex shrink-0 items-center justify-center rounded-xl px-1"
            >
              <span
                className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${
                  useBackupSupplier
                    ? 'border-[var(--teal)] bg-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--navy)]'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    useBackupSupplier ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Live Green Savings Readout + Save Run Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--teal)]/35 bg-[var(--teal)]/10 p-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[var(--teal)] shrink-0" aria-hidden="true" />
              <div>
                <div className="inline-flex items-center gap-1 font-mono text-lg sm:text-xl font-bold text-[var(--teal)] tabular-nums">
                  <span>You save {formatRs(savedInr)}</span>
                  <MetricTooltip
                    label={t.metrics.saveTodayTitle}
                    explanation={t.metricTooltips.savingsToday}
                    align="left"
                  />
                </div>
                <div className="text-xs text-[var(--text)]/80">
                  {hasTryItChanges
                    ? `Updated hit: Day ${activeImpact.daysToImpact}, ${activeImpact.assessment.exposedDays} shortage days`
                    : 'Move the slider or switch on backup to test savings'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveRun}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--amber)] px-4 text-xs sm:text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
            >
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              <span>Save run to compare</span>
            </button>
          </div>
        </div>

        {/* Three-Bar Best / Likely / Worst */}
        <div className="lg:col-span-6 instrument-panel instrument-ticks p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="inline-flex items-center gap-1.5 font-display text-base sm:text-lg font-semibold text-[var(--text)]">
              <span>Best / Likely / Worst range</span>
              <MetricTooltip
                label="Best, Likely, Worst outcomes"
                explanation={t.metricTooltips.bestLikelyWorst}
              />
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              Across {sim.runs} what-if checks, chance of running short is{' '}
              {sim.chanceOfRunningOutPct}%.
            </p>
          </div>

          <div className="space-y-3.5">
            {confidenceBars.map((bar) => {
              const pctWidth = Math.max(8, Math.round((bar.money / maxMoney) * 100));
              return (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-[var(--text)]">{bar.label}</span>
                    <span className="font-mono text-[var(--text)] tabular-nums">
                      {formatRs(bar.money)} · {bar.days} shortage days
                    </span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-[var(--panel)] border border-[var(--line)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pctWidth}%`, backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3 text-xs text-[var(--muted)] flex flex-wrap items-center gap-1">
            <span>Affected vendor:</span>
            <strong className="text-[var(--text)]">{activeImpact.sourceSupplierName}</strong>
            <span>· {activeImpact.pathDependencyPct}% supply share</span>
            <MetricTooltip
              label={t.ui.supplyShareLabel}
              explanation={t.metricTooltips.supplyShare}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Compare View for up to 3 Saved Runs */}
      <section
        aria-label="Compare saved runs"
        className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text)]">
              Compare saved runs ({savedRuns.length}/3)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              Save your baseline and up to 2 try-it variations side by side to pick the best plan.
            </p>
          </div>

          {savedRuns.length > 0 && (
            <button
              type="button"
              onClick={clearSavedRuns}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {savedRuns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--navy)]/60 p-5 text-center text-xs sm:text-sm text-[var(--muted)]">
            No saved runs yet. Click <strong className="text-[var(--amber)]">Save run to compare</strong> above to pin this scenario, then adjust the stock slider or backup switch and save again.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {savedRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <TrafficLightTag level={run.alertLevel} />
                    <button
                      type="button"
                      onClick={() => removeSavedRun(run.id)}
                      aria-label={`Remove ${run.label}`}
                      className="flex min-h-[44px] min-w-[44px] -my-2 -mr-2 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--navy)] hover:text-[var(--text)]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[var(--amber)]">{run.label}</div>
                    <div className="text-sm font-bold text-[var(--text)] leading-snug mt-0.5">
                      {run.eventTitle}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">{run.supplierName}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-2 text-xs">
                    <div>
                      <div className="text-[var(--muted)]">Hurts you in</div>
                      <div className="font-mono font-bold text-[var(--text)] tabular-nums">
                        {run.daysToImpact} days
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--muted)]">Run short</div>
                      <div className="font-mono font-bold text-[var(--text)] tabular-nums">
                        {run.exposedDays} days
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--muted)]">Money at risk</div>
                      <div className="font-mono font-bold text-[var(--ember)] tabular-nums">
                        {formatRs(run.moneyAtRisk)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--muted)]">You save</div>
                      <div className="font-mono font-bold text-[var(--teal)] tabular-nums">
                        {formatRs(run.savedInr)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--navy)] px-2.5 py-2 text-[11px] text-[var(--muted)] font-mono tabular-nums">
                  Best {formatRs(run.bestMoney)} · Likely {formatRs(run.likelyMoney)} · Worst{' '}
                  {formatRs(run.worstMoney)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
