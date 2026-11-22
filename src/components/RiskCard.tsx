import React from 'react';
import { HelpCircle } from 'lucide-react';
import { formatInr, type RippleImpact, type WhyExplanation } from '../engine';
import { useDeepTier } from '../state/store';
import { HAZARD_ICON } from './hazardIcons';
import { TrafficLightTag } from './RingMotif';

interface RiskCardProps {
  impact: RippleImpact;
  onExplain: (why: WhyExplanation) => void;
  onSelect: () => void;
}

export function RiskCard({ impact, onExplain, onSelect }: RiskCardProps) {
  const { t } = useDeepTier();

  const layerText =
    impact.sourceLayer === 1
      ? t.layers.layer1
      : impact.sourceLayer === 2
        ? t.layers.layer2
        : t.layers.layer3;

  return (
    <article className="instrument-panel instrument-ticks p-4 sm:p-5 flex flex-col justify-between gap-4">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--amber)]">
              {HAZARD_ICON[impact.hazardType]}
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--text)] leading-snug">
                {impact.eventTitle}
              </h3>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                {impact.sourceSupplierName} · {layerText}
              </div>
            </div>
          </div>
          <TrafficLightTag level={impact.alertLevel} />
        </div>

        <p className="text-sm sm:text-base text-[var(--text)]/90 leading-relaxed">
          {impact.recommendedAction}
        </p>

        {impact.verifiedStatus === 'unverified' && (
          <p className="text-xs font-medium text-[var(--risk-watch)]">
            {t.controls.unverifiedBadge}: {t.alerts.rumourCapNote}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums">
          <span className="text-[var(--text)] font-semibold">
            {impact.daysToImpact}d stock
          </span>
          <span className="text-[var(--muted)]">
            {impact.chanceOfRunningOutPct}% run-out
          </span>
          <span className="text-[var(--amber)] font-semibold">
            {formatInr(impact.costAtRiskInr)} at risk
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onExplain(impact.whyByMetric.riskScore)}
            className="min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)]"
          >
            <HelpCircle className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
            <span>{t.controls.whyButton}</span>
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="min-h-[44px] rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-[var(--teal)] hover:border-[var(--teal)]"
          >
            See ripple
          </button>
        </div>
      </div>
    </article>
  );
}
