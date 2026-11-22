import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RippleImpact } from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';
import { MetricTooltip } from './MetricTooltip';

interface ImpactChartProps {
  impact: RippleImpact;
  tryItImpact?: RippleImpact | null;
  durationDays?: number;
}

export function ImpactChart({ impact, tryItImpact, durationDays }: ImpactChartProps) {
  const { t } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();

  const totalDays = Math.max(
    14,
    Math.min(32, (durationDays ?? impact.daysToImpact + impact.assessment.exposedDays) + 3),
  );

  const B = impact.daysToImpact;
  const exposedDays = impact.assessment.exposedDays;
  const shortageStartDay = Math.min(totalDays, B);
  const shortageEndDay = exposedDays > 0 ? Math.min(totalDays, B + exposedDays) : null;

  const data = useMemo(() => {
    const pts: Array<{
      day: number;
      dayLabel: string;
      stockPct: number;
      tryItStockPct?: number;
    }> = [];

    const hasTryIt =
      Boolean(tryItImpact) &&
      (tryItImpact!.daysToImpact !== impact.daysToImpact ||
        tryItImpact!.costAtRiskInr !== impact.costAtRiskInr);

    for (let day = 0; day <= totalDays; day++) {
      const stockPct =
        B <= 0
          ? 0
          : day >= B
            ? 0
            : Math.round(Math.max(0, 100 * (1 - day / B)));

      let tryItStockPct: number | undefined;
      if (hasTryIt && tryItImpact) {
        const tryB = tryItImpact.daysToImpact;
        tryItStockPct =
          tryB <= 0
            ? 0
            : day >= tryB
              ? 0
              : Math.round(Math.max(0, 100 * (1 - day / tryB)));
      }

      pts.push({
        day,
        dayLabel: `D${day}`,
        stockPct,
        ...(tryItStockPct !== undefined ? { tryItStockPct } : {}),
      });
    }
    return pts;
  }, [B, impact.costAtRiskInr, impact.daysToImpact, totalDays, tryItImpact]);

  const hasTryItCurve = data.some((d) => d.tryItStockPct !== undefined);

  return (
    <div className="instrument-panel instrument-ticks p-4 sm:p-5 h-full flex flex-col justify-between">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="inline-flex items-center gap-1.5 font-display text-base sm:text-lg font-semibold text-[var(--text)]">
            <span>{t.ui.dayByDayTimeline}</span>
            <MetricTooltip
              label={t.ui.stockRemainingLabel}
              explanation={t.metricTooltips.stockLeftPct}
            />
          </h3>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            {exposedDays > 0
              ? `Stock hits 0% on Day ${B}. Shaded red shows ${exposedDays} shortage days.`
              : `Your ${B} stock days cover this trouble without running empty.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
            <span>{t.ui.stockRemainingLabel}</span>
          </span>
          {shortageEndDay && shortageEndDay > shortageStartDay && (
            <span className="inline-flex items-center gap-1 text-[var(--muted)]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--risk-urgent)]/45 border border-[var(--risk-urgent)]" />
              <span>{t.ui.shortageDaysLabel}</span>
              <MetricTooltip
                label={t.ui.shortageDaysLabel}
                explanation={t.metricTooltips.shortageDays}
                align="right"
              />
            </span>
          )}
          {hasTryItCurve && (
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
              <span>With try-it plan</span>
            </span>
          )}
        </div>
      </div>

      <div className="h-64 w-full" role="img" aria-label={t.ui.dayByDayTimeline}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="stockLeftGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="tryItGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--line)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val: number) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--navy)',
                borderColor: 'var(--line)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '12px',
              }}
              formatter={(value: unknown, name: unknown) => [
                `${Number(value ?? 0)}% stock left`,
                name === 'tryItStockPct' ? 'With try-it plan' : 'Stock remaining',
              ]}
            />

            {shortageEndDay && shortageEndDay > shortageStartDay && (
              <ReferenceArea
                x1={`D${shortageStartDay}`}
                x2={`D${shortageEndDay}`}
                fill="var(--risk-urgent)"
                fillOpacity={0.18}
                stroke="var(--risk-urgent)"
                strokeOpacity={0.45}
                strokeDasharray="3 3"
              />
            )}

            <ReferenceLine
              x={`D${Math.min(totalDays, B)}`}
              stroke="var(--risk-urgent)"
              strokeDasharray="4 4"
              label={{
                value: `Hits Day ${B}`,
                position: 'top',
                fill: 'var(--risk-urgent)',
                fontSize: 11,
              }}
            />

            <Area
              type="monotone"
              dataKey="stockPct"
              stroke="var(--amber)"
              strokeWidth={2.5}
              fill="url(#stockLeftGrad)"
              isAnimationActive={!prefersReducedMotion}
            />

            {hasTryItCurve && (
              <Area
                type="monotone"
                dataKey="tryItStockPct"
                stroke="var(--teal)"
                strokeWidth={2.2}
                strokeDasharray="5 3"
                fill="url(#tryItGrad)"
                isAnimationActive={!prefersReducedMotion}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
