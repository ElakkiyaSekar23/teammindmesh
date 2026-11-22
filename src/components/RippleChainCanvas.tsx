import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { RippleImpact } from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

interface RippleChainCanvasProps {
  impact: RippleImpact;
}

interface StepSchedule {
  startDay: number;
  drainEndDay: number;
  transitEndDay: number;
  stockDays: number;
  transitDays: number;
}

export function RippleChainCanvas({ impact }: RippleChainCanvasProps) {
  const { t } = useDeepTier();

  const totalDays = Math.max(1, impact.daysToImpact);

  // Build exact day-by-day schedule for draining at each supplier and traveling link-by-link to YOU
  const schedules = useMemo<StepSchedule[]>(() => {
    const list: StepSchedule[] = [];
    let cursor = 0;
    for (let i = 0; i < impact.path.length; i++) {
      const step = impact.path[i];
      const isYou = step.layer === 0 || i === impact.path.length - 1;
      if (isYou) {
        list.push({
          startDay: cursor,
          drainEndDay: cursor,
          transitEndDay: cursor,
          stockDays: step.stockDays,
          transitDays: 0,
        });
      } else {
        const drainDuration = Math.max(0.5, step.stockDays);
        const transitDuration = Math.max(0.5, step.transitDays || 2);
        const drainEndDay = cursor + drainDuration;
        const transitEndDay = drainEndDay + transitDuration;
        list.push({
          startDay: cursor,
          drainEndDay,
          transitEndDay,
          stockDays: step.stockDays,
          transitDays: transitDuration,
        });
        cursor = transitEndDay;
      }
    }
    return list;
  }, [impact.path]);

  const scheduleMaxDay = useMemo(
    () => Math.max(totalDays, schedules[schedules.length - 1]?.transitEndDay ?? totalDays),
    [schedules, totalDays],
  );

  const prefersReducedMotion = usePrefersReducedMotion();
  const [playNonce, setPlayNonce] = useState(0);
  const [elapsedDay, setElapsedDay] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setElapsedDay(scheduleMaxDay);
      return;
    }

    setElapsedDay(0);
    const animDurationMs = 4200;
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / animDurationMs);
      setElapsedDay(progress * scheduleMaxDay);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    impact.eventId,
    impact.sourceSupplierId,
    impact.daysToImpact,
    scheduleMaxDay,
    playNonce,
    prefersReducedMotion,
  ]);

  const rippleColor =
    impact.alertLevel === 'critical'
      ? 'var(--risk-urgent)'
      : impact.alertLevel === 'warning'
        ? 'var(--risk-danger)'
        : impact.alertLevel === 'watch'
          ? 'var(--risk-watch)'
          : 'var(--teal)';

  const displayedDay = Math.min(
    impact.daysToImpact,
    Math.round((elapsedDay / Math.max(0.1, scheduleMaxDay)) * impact.daysToImpact),
  );
  const reachedBusiness = elapsedDay >= scheduleMaxDay - 0.05;

  return (
    <div className="instrument-panel instrument-ticks p-4 sm:p-5 overflow-hidden space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[var(--text)]">
            Stone-in-water ripple traveling link by link toward you
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            Pauses at each supplier as its stock drains (yellow at half, red when empty) until Day{' '}
            {impact.daysToImpact}.
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="rounded-lg border border-[var(--line)] bg-[var(--navy)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--amber)] tabular-nums">
            {reachedBusiness
              ? `Reached you · Day ${impact.daysToImpact}`
              : `Day ${displayedDay} / ${impact.daysToImpact}`}
          </span>
          <button
            type="button"
            onClick={() => setPlayNonce((n) => n + 1)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
            <span>{t.ui.replay}</span>
          </button>
        </div>
      </div>

      {/* Concentric stone-drop ripple -> draining supplier bars -> YOU */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {impact.path.map((step, idx) => {
          const isDropSource = idx === 0;
          const isYou = step.layer === 0;
          const sched = schedules[idx];

          // Compute live remaining stock fraction (1 -> 0) as ripple pauses here
          let remainingFraction = 1;
          let statusLabel = `${step.stockDays} ${t.metrics.stockDaysUnit}`;
          let barColor = 'var(--teal)';
          let cardBorder = 'var(--line)';

          if (!isYou && sched) {
            if (elapsedDay <= sched.startDay) {
              remainingFraction = 1;
              barColor = 'var(--teal)';
            } else if (elapsedDay < sched.drainEndDay) {
              const span = Math.max(0.1, sched.drainEndDay - sched.startDay);
              remainingFraction = Math.max(0, 1 - (elapsedDay - sched.startDay) / span);
              if (remainingFraction <= 0.15) {
                barColor = 'var(--risk-urgent)';
                cardBorder = 'var(--risk-urgent)';
                statusLabel = 'Running empty';
              } else if (remainingFraction <= 0.55) {
                barColor = 'var(--risk-watch)';
                cardBorder = 'var(--risk-watch)';
                statusLabel = `${Math.max(1, Math.ceil(step.stockDays * remainingFraction))}d left`;
              } else {
                barColor = 'var(--teal)';
                statusLabel = `${Math.ceil(step.stockDays * remainingFraction)}d left`;
              }
            } else {
              remainingFraction = 0;
              barColor = 'var(--risk-urgent)';
              cardBorder = 'var(--risk-urgent)';
              statusLabel = `Out (had ${step.stockDays}d)`;
            }
          } else if (isYou) {
            if (reachedBusiness) {
              barColor = rippleColor;
              cardBorder = rippleColor;
              statusLabel = `Hits Day ${impact.daysToImpact}`;
            } else {
              barColor = 'var(--teal)';
              statusLabel = `${step.stockDays} own stock days`;
            }
          }

          // Arrow travel progress between step idx and idx + 1
          const inTransit =
            !isYou &&
            sched &&
            elapsedDay >= sched.drainEndDay &&
            elapsedDay < sched.transitEndDay;
          const transitDone = !isYou && sched && elapsedDay >= sched.transitEndDay;
          const transitFraction =
            !isYou && sched && sched.transitDays > 0
              ? Math.max(
                  0,
                  Math.min(1, (elapsedDay - sched.drainEndDay) / sched.transitDays),
                )
              : 0;

          const layerLabel = isYou
            ? t.layers.you
            : step.layer === 1
              ? t.layers.layer1
              : step.layer === 2
                ? t.layers.layer2
                : t.layers.layer3;

          return (
            <React.Fragment key={`${step.supplierId}-${idx}`}>
              <div
                style={{ borderColor: cardBorder }}
                className="relative flex-1 rounded-xl border bg-[var(--panel)] p-3.5 transition-colors duration-200"
              >
                {isDropSource && (
                  <div className="pointer-events-none absolute -top-2 -right-2 h-10 w-10 flex items-center justify-center">
                    {!prefersReducedMotion && (
                      <>
                        <motion.span
                          className="absolute inset-0 rounded-full border"
                          style={{ borderColor: rippleColor }}
                          initial={{ scale: 0.4, opacity: 0.9 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.95, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.span
                          className="absolute inset-1.5 rounded-full border"
                          style={{ borderColor: rippleColor }}
                          initial={{ scale: 0.4, opacity: 0.9 }}
                          animate={{ scale: 1.4, opacity: 0 }}
                          transition={{
                            duration: 0.95,
                            delay: 0.25,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                        />
                      </>
                    )}
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: rippleColor }}
                    />
                  </div>
                )}

                {isYou && reachedBusiness && (
                  <div className="pointer-events-none absolute -top-2 -right-2 h-9 w-9 flex items-center justify-center">
                    {!prefersReducedMotion && (
                      <motion.span
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: rippleColor }}
                        initial={{ scale: 0.5, opacity: 0.95 }}
                        animate={{ scale: 1.7, opacity: 0 }}
                        transition={{ duration: 1.0, repeat: Infinity, ease: 'easeOut' }}
                      />
                    )}
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: rippleColor }}
                    />
                  </div>
                )}

                <div
                  className="text-[11px] font-semibold"
                  style={{
                    color: isYou
                      ? reachedBusiness
                        ? rippleColor
                        : 'var(--teal)'
                      : isDropSource
                        ? rippleColor
                        : 'var(--muted)',
                  }}
                >
                  {layerLabel}
                </div>
                <div className="mt-0.5 font-display text-sm font-bold text-[var(--text)]">
                  {step.supplierName}
                </div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">
                  {step.city} · {step.itemSupplied}
                </div>

                {/* Live draining stock bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                    <span className="text-[var(--muted)]">{step.stockDays}d stock</span>
                    <span className="font-bold" style={{ color: barColor }}>
                      {statusLabel}
                    </span>
                  </div>
                  {!isYou && (
                    <div className="h-2 w-full rounded-full bg-[var(--navy)] border border-[var(--line)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-colors duration-150"
                        style={{
                          width: `${Math.round(remainingFraction * 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {idx < impact.path.length - 1 && (
                <div className="flex flex-col items-center justify-center shrink-0 min-w-[44px]">
                  <div className="relative flex items-center justify-center w-10 h-6">
                    <ArrowRight
                      className={`h-4 w-4 rotate-90 md:rotate-0 transition-colors ${
                        inTransit || transitDone
                          ? 'text-[var(--amber)]'
                          : 'text-[var(--muted)]/50'
                      }`}
                      aria-hidden="true"
                    />
                    {inTransit && (
                      <span
                        className="hidden md:block absolute h-2.5 w-2.5 rounded-full bg-[var(--amber)] shadow"
                        style={{
                          left: `${Math.round(transitFraction * 78)}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    +{step.transitDays || 2}d
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
