import React from 'react';
import { motion } from 'motion/react';
import { Clock, HelpCircle } from 'lucide-react';
import type { RippleImpact, TroubleEvent, WhyExplanation } from '../engine';
import { useDeepTier } from '../state/store';
import { MetricTooltip } from './MetricTooltip';
import { TrafficLightTag } from './RingMotif';
import { RiskTypeIcon } from './RiskTypeIcon';

interface DaysLeftClockProps {
  impact: RippleImpact | undefined;
  event?: TroubleEvent;
  onExplain: (why: WhyExplanation) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}

export function DaysLeftClock({
  impact,
  event,
  onExplain,
  onPrimaryAction,
  primaryActionLabel,
}: DaysLeftClockProps) {
  const { t, graph } = useDeepTier();
  const daysLeft = impact?.daysToImpact ?? graph.business.ownStockDays + 12;
  const maxWindowDays = 21;
  const progress = Math.min(1, Math.max(0.08, daysLeft / maxWindowDays));

  const itemName =
    impact?.path[impact.path.length - 2]?.itemSupplied ??
    impact?.path[0]?.itemSupplied ??
    'Key stock';
  const shortItem = itemName.split(' ').slice(0, 2).join(' ');

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = !impact
    ? 'var(--teal)'
    : impact.alertLevel === 'critical'
      ? 'var(--risk-urgent)'
      : impact.alertLevel === 'warning'
        ? 'var(--risk-danger)'
        : impact.alertLevel === 'watch'
          ? 'var(--risk-watch)'
          : 'var(--teal)';

  const layerLabel = !impact
    ? ''
    : impact.sourceLayer === 1
      ? t.layers.layer1
      : impact.sourceLayer === 2
        ? t.layers.layer2
        : t.layers.layer3;

  const chainStockDays = impact
    ? impact.assessment.chain.reduce((sum, node) => sum + node.stockDays, 0)
    : 0;
  const transitBufferDays = impact ? Math.max(0, daysLeft - chainStockDays) : 0;

  return (
    <div data-spotlight="days-left-clock" className="surface-card p-5 h-full flex flex-col justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--line)"
              strokeWidth="10"
            />
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Runway</span>
            </span>
            <div className="mt-0.5 font-mono text-3xl font-bold text-[var(--text)] tabular-nums">
              {daysLeft}d
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <TrafficLightTag level={impact?.alertLevel ?? 'safe'} />
            {impact && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] truncate">
                <RiskTypeIcon type={impact.hazardType} className="h-3.5 w-3.5 text-[var(--amber)] shrink-0" />
                <span className="truncate">
                  {impact.sourceSupplierName} · {layerLabel}
                </span>
              </span>
            )}
            <MetricTooltip
              label={t.metrics.daysLeftTitle}
              explanation={t.metricTooltips.daysUntilHits}
              align="left"
            />
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
            {impact
              ? `${shortItem}: ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
              : `Stock steady (${daysLeft}+ days)`}
          </h2>

          <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-2">
            {event?.plainSummary ?? impact?.recommendedAction ?? graph.business.summaryLine}
          </p>

          {impact && (
            <p className="font-mono text-[11px] text-[var(--teal)]">
              {chainStockDays}d stock + {transitBufferDays}d road = {daysLeft}d runway · Risk {impact.riskScore}/100
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="min-h-[44px] rounded-lg bg-[var(--amber)] px-4 text-xs sm:text-sm font-bold text-[var(--amber-ink)] hover:brightness-105"
        >
          {primaryActionLabel}
        </button>

        {impact && (
          <button
            type="button"
            onClick={() => onExplain(impact.whyByMetric.daysToImpact)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)]"
          >
            <HelpCircle className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
            <span>{t.controls.whyButton}</span>
          </button>
        )}
      </div>
    </div>
  );
}
