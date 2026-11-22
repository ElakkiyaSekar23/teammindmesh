import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';
import {
  computeBusinessExposure,
  type ChainRiskSummary,
  type SupplyChainGraph,
  type WhyExplanation,
} from '../engine';
import { useDeepTier } from '../state/store';
import { MetricTooltip } from './MetricTooltip';

interface HiddenRiskMeterProps {
  riskSummary: ChainRiskSummary;
  onExplain: (why: WhyExplanation) => void;
}

export function HiddenRiskMeter({ riskSummary, onExplain }: HiddenRiskMeterProps) {
  const { graph, events, t } = useDeepTier();
  const [viewMode, setViewMode] = useState<'with' | 'without'>('with');

  const totalSuppliers = graph.suppliers.length;
  const directSuppliers = useMemo(
    () => graph.suppliers.filter((s) => s.layer === 1),
    [graph.suppliers],
  );
  const directCount = directSuppliers.length;
  const hiddenCount = totalSuppliers - directCount;

  const withoutScore = useMemo(() => {
    const layer1OnlyGraph: SupplyChainGraph = {
      business: graph.business,
      suppliers: directSuppliers,
      links: graph.links.filter((l) => l.toId === 'YOU'),
    };
    return computeBusinessExposure(layer1OnlyGraph, events);
  }, [directSuppliers, events, graph.business, graph.links]);

  const withScore = riskSummary.overallRiskScore;
  const activeScore = viewMode === 'with' ? withScore : withoutScore;
  const scoreDifference = Math.max(0, withScore - withoutScore);

  const earlyWarningGainDays = riskSummary.earliestImpactDays
    ? Math.max(3, riskSummary.earliestImpactDays + 2)
    : 7;

  return (
    <div className="surface-card p-5 h-full flex flex-col justify-between gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--text)] flex items-center gap-1.5">
            <span>{t.metrics.exposedScoreTitle}</span>
            <MetricTooltip
              label={t.metrics.exposedScoreTitle}
              explanation={t.metricTooltips.chainExposure}
              align="left"
            />
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {viewMode === 'with'
              ? `${hiddenCount} Layer 2 & 3 suppliers included`
              : `Only ${directCount} direct vendors checked`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onExplain(riskSummary.overallWhy)}
          className="min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)]"
        >
          <HelpCircle className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
          <span>{t.controls.whyButton}</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-[var(--text)] tabular-nums">
              {activeScore}
              <span className="text-sm font-normal text-[var(--muted)]"> / 100</span>
            </span>
            {scoreDifference > 0 && (
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  viewMode === 'with' ? 'text-[var(--amber)]' : 'text-[var(--ember)]'
                }`}
              >
                {viewMode === 'with'
                  ? `+${scoreDifference} hidden risk caught`
                  : `${scoreDifference} hidden risk missed`}
              </span>
            )}
          </div>
          <span className="font-mono text-xs text-[var(--teal)] tabular-nums">
            +{earlyWarningGainDays}d head start
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--panel)]">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, var(--teal) 0%, var(--risk-watch) 45%, var(--risk-danger) 75%, var(--risk-urgent) 100%)',
            }}
            initial={false}
            animate={{ width: `${Math.max(4, activeScore)}%` }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Visibility mode"
        className="grid grid-cols-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1"
      >
        <button
          type="button"
          onClick={() => setViewMode('without')}
          aria-pressed={viewMode === 'without'}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${
            viewMode === 'without'
              ? 'bg-[var(--navy)] text-[var(--ember)]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.controls.withoutDeepTier}</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('with')}
          aria-pressed={viewMode === 'with'}
          className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${
            viewMode === 'with'
              ? 'bg-[var(--teal)] text-[var(--amber-ink)]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.controls.withDeepTier}</span>
        </button>
      </div>
    </div>
  );
}
