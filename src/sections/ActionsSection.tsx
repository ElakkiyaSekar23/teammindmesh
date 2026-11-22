import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Volume2, VolumeX } from 'lucide-react';
import { formatInr, type AppRoute } from '../engine';
import { useDeepTier } from '../state/store';
import { MetricTooltip } from '../components/MetricTooltip';
import { RingEmptyState } from '../components/RingMotif';

interface ActionsSectionProps {
  onNavigate: (route: AppRoute) => void;
}

export function ActionsSection({ onNavigate }: ActionsSectionProps) {
  const { riskSummary, toggleActionCompleted, language, t } = useDeepTier();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const nextPendingAction = riskSummary.actions.find((a) => !a.completed);
  const completedCount = riskSummary.actions.filter((a) => a.completed).length;
  const pendingCount = riskSummary.actions.length - completedCount;

  const handleReadAloud = (id: string, textToRead: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsError(t.ui.ttsNotSupported);
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    setTtsError(null);
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(textToRead);
    utter.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  };

  if (riskSummary.actions.length === 0) {
    return (
      <RingEmptyState
        title={t.sections.actionsHeading}
        subtitle={t.sections.noTroublesYet}
        actionLabel={t.nav.newsWatch}
        onAction={() => onNavigate('news-watch')}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {t.sections.actionsHeading}
          </h1>
          <p className="mt-1 text-base text-[var(--muted)]">{t.sections.actionsSub}</p>
        </div>

        {nextPendingAction ? (
          <button
            type="button"
            onClick={() => toggleActionCompleted(nextPendingAction.id)}
            className="min-h-[48px] rounded-xl bg-[var(--amber)] px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
          >
            {t.ui.markTopStepDone}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('news-watch')}
            className="min-h-[48px] rounded-xl bg-[var(--amber)] px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
          >
            {t.ui.checkLocalNewsCta}
          </button>
        )}
      </div>

      {/* Action progress + savings summary */}
      <div className="instrument-panel instrument-ticks p-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono font-semibold text-[var(--teal)] tabular-nums">
            {t.ui.completedSteps}: {completedCount}
          </span>
          <span className="font-mono font-semibold text-[var(--amber)] tabular-nums">
            {t.ui.pendingSteps}: {pendingCount}
          </span>
          {pendingCount === 0 && (
            <span className="text-xs font-medium text-[var(--teal)]">
              {t.ui.allStepsDone}
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--teal)] tabular-nums">
          <span>
            {t.metrics.saveTodayTitle}: {formatInr(riskSummary.totalPotentialSavingsInr)}
          </span>
          <MetricTooltip
            label={t.metrics.saveTodayTitle}
            explanation={t.metricTooltips.savingsToday}
            align="right"
          />
        </div>
      </div>

      {ttsError && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--risk-watch)]/50 bg-[var(--panel)] px-4 py-2.5 text-xs text-[var(--risk-watch)]"
        >
          {ttsError}
        </div>
      )}

      <div className="instrument-panel instrument-ticks p-4 sm:p-6">
        <ul className="space-y-3">
          {riskSummary.actions.map((action) => (
            <li
              key={action.id}
              className="instrument-panel-raised p-4 transition-colors"
              style={{
                opacity: action.completed ? 0.65 : 1,
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => toggleActionCompleted(action.id)}
                  aria-pressed={action.completed}
                  className="flex min-h-[44px] items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
                >
                  {action.completed ? (
                    <CheckCircle2
                      className="h-5 w-5 text-[var(--teal)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-5 w-5 text-[var(--amber)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <div
                      className={`text-base font-bold ${
                        action.completed
                          ? 'line-through text-[var(--muted)]'
                          : 'text-[var(--text)]'
                      }`}
                    >
                      {action.title}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-[var(--muted)]">
                      {action.plainReason}
                      {action.verifiedStatus === 'unverified' && ` · ${t.controls.unverifiedBadge}`}
                    </div>
                  </div>
                </button>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 font-mono text-base font-bold text-[var(--teal)] tabular-nums">
                      <span>{formatInr(action.potentialSavingsInr)}</span>
                      <MetricTooltip
                        label={t.metrics.saveTodayTitle}
                        explanation={t.metricTooltips.savingsToday}
                        align="right"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">can be saved</div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleReadAloud(action.id, `${action.title}. ${action.plainReason}`)
                    }
                    aria-label={
                      speakingId === action.id ? t.controls.stopListening : t.controls.listenAloud
                    }
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--navy)] text-[var(--text)] hover:border-[var(--amber)]"
                  >
                    {speakingId === action.id ? (
                      <VolumeX className="h-4 w-4 text-[var(--risk-urgent)]" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-[var(--teal)]" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
