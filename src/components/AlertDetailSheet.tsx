import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ExternalLink, MapPin, MessageCircle, Share2, X } from 'lucide-react';
import {
  formatInr,
  type ActionItem,
  type RippleImpact,
  type TroubleEvent,
} from '../engine';
import { useDeepTier } from '../state/store';
import { LanguageChip } from './LanguageChip';
import { MetricTooltip } from './MetricTooltip';
import { RippleChainCanvas } from './RippleChainCanvas';
import { RingEmptyState, TrafficLightTag } from './RingMotif';
import { getRiskTypeLabel, RiskTypeIcon } from './RiskTypeIcon';

interface AlertDetailSheetProps {
  event: TroubleEvent | null;
  impact: RippleImpact | null;
  actions: ActionItem[];
  onClose: () => void;
}

export function buildWhatsAppShareUrl(
  event: TroubleEvent,
  impact: RippleImpact | null,
  businessName: string,
): string {
  const daysLine = impact
    ? `${impact.daysToImpact} days until it hurts ${businessName} (${impact.sourceSupplierName}).`
    : `Watching ${event.region} for impact on ${businessName}.`;
  const actionLine = impact ? ` Next step: ${impact.recommendedAction}` : '';
  const text = `DeepTier Alert (${event.region}): ${event.title}. ${daysLine}${actionLine}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatSourceLabel(
  sourceKind: TroubleEvent['sourceKind'],
  t: ReturnType<typeof useDeepTier>['t'],
): string {
  if (sourceKind === 'govt alert') return t.controls.sourceGovt;
  if (sourceKind === 'forward') return t.controls.sourceForward;
  if (sourceKind === 'news') return t.controls.sourceNews;
  return t.controls.sourceManual;
}

export function AlertDetailSheet({
  event,
  impact,
  actions,
  onClose,
}: AlertDetailSheetProps) {
  const { t, graph, toggleActionCompleted } = useDeepTier();
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!event) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onClose]);

  if (!event) return null;

  const layerName = impact
    ? impact.sourceLayer === 1
      ? t.layers.layer1
      : impact.sourceLayer === 2
        ? t.layers.layer2
        : t.layers.layer3
    : '';
  const waUrl = buildWhatsAppShareUrl(event, impact, graph.business.businessName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="instrument-panel instrument-ticks w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <TrafficLightTag level={impact?.alertLevel ?? 'safe'} />
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 font-semibold text-[var(--text)]">
                <RiskTypeIcon type={event.type} className="h-3.5 w-3.5 text-[var(--amber)]" />
                <span>{getRiskTypeLabel(event.type)}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{event.region}</span>
              </span>
              <LanguageChip code={event.language} />
              <span
                className={`font-semibold ${
                  event.sourceKind === 'forward'
                    ? 'text-[var(--risk-watch)]'
                    : 'text-[var(--teal)]'
                }`}
              >
                {formatSourceLabel(event.sourceKind, t)}
              </span>
            </div>

            <h2
              id="alert-detail-title"
              className="font-display text-xl sm:text-2xl font-bold text-[var(--text)]"
            >
              {event.title}
            </h2>

            {impact && (
              <p className="text-sm font-medium text-[var(--amber)]">
                {impact.sourceSupplierName} ({layerName}) · {impact.daysToImpact}{' '}
                {t.controls.daysUntilHurtsLabel}
              </p>
            )}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.controls.close}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)] shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Ripple animation */}
        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-[var(--text)]">
            {t.sections.rippleHeading}
          </h3>
          {impact ? (
            <RippleChainCanvas impact={impact} />
          ) : (
            <RingEmptyState
              title="No supplier hit in your current chain"
              subtitle={`This ${event.region} report does not touch your mapped suppliers today.`}
            />
          )}
        </section>

        {/* Plain "Why?" explanation */}
        <section className="instrument-panel-raised p-4 sm:p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-[var(--amber)]">
            {t.controls.plainWhyHeading}
          </h3>
          {impact ? (
            <>
              <ul className="space-y-2 text-sm sm:text-base text-[var(--text)] leading-relaxed">
                {impact.whyByMetric.riskScore.sentences.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--amber)] shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--line)] text-center">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-2.5">
                  <div className="font-mono text-lg font-bold text-[var(--text)] tabular-nums">
                    {impact.daysToImpact}d
                  </div>
                  <div className="text-[11px] text-[var(--muted)] flex items-center justify-center gap-1">
                    <span>{t.metrics.daysLeftTitle}</span>
                    <MetricTooltip
                      label={t.metrics.daysLeftTitle}
                      explanation={t.metricTooltips.daysUntilHits}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-2.5">
                  <div className="font-mono text-lg font-bold text-[var(--risk-danger)] tabular-nums">
                    {impact.chanceOfRunningOutPct}%
                  </div>
                  <div className="text-[11px] text-[var(--muted)] flex items-center justify-center gap-1">
                    <span>{t.metrics.chanceOutTitle}</span>
                    <MetricTooltip
                      label={t.metrics.chanceOutTitle}
                      explanation={t.metricTooltips.chanceOut}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-2.5">
                  <div className="font-mono text-lg font-bold text-[var(--ember)] tabular-nums">
                    {formatInr(impact.costAtRiskInr)}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] flex items-center justify-center gap-1">
                    <span>{t.metrics.moneyAtRiskTitle}</span>
                    <MetricTooltip
                      label={t.metrics.moneyAtRiskTitle}
                      explanation={t.metricTooltips.moneyAtRisk}
                      align="right"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm sm:text-base text-[var(--muted)]">{event.plainSummary}</p>
          )}

          {event.verifiedStatus === 'unverified' && (
            <p className="text-xs font-semibold text-[var(--risk-watch)]">
              {t.alerts.rumourCapNote}
            </p>
          )}
        </section>

        {/* Do-this-today actions */}
        <section className="space-y-3">
          <h3 className="font-display text-base font-bold text-[var(--text)]">
            {t.controls.doThisToday}
          </h3>
          {actions.length > 0 ? (
            <div className="space-y-2.5">
              {actions.map((act) => (
                <div
                  key={act.id}
                  className="instrument-panel-raised p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-semibold text-[var(--text)]">
                      {act.title}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {act.plainReason} · Save up to{' '}
                      <span className="font-mono font-semibold text-[var(--teal)]">
                        {formatInr(act.potentialSavingsInr)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActionCompleted(act.id)}
                    aria-pressed={act.completed}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold shrink-0 transition-colors ${
                      act.completed
                        ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                        : 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{act.completed ? t.ui.done : t.ui.markDone}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="instrument-panel-raised p-4 text-sm text-[var(--muted)]">
              Keep watching this area. No emergency order needed today.
            </div>
          )}
        </section>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[var(--teal)] bg-[var(--teal)]/10 px-4 py-2 text-xs sm:text-sm font-bold text-[var(--teal)] hover:bg-[var(--teal)]/20"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.controls.shareWhatsApp}</span>
            </a>

            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--text)] hover:border-[var(--teal)] hover:text-[var(--teal)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span>Open live source</span>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl bg-[var(--amber)] px-5 py-2 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105"
          >
            {t.controls.close}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
