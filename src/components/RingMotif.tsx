import React from 'react';
import { motion } from 'motion/react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import type { AlertLevel } from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

export function RingLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="18" cy="18" r="15.5" stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />
      <circle cx="18" cy="18" r="11" stroke="var(--amber)" strokeWidth="1.75" opacity="0.95" />
      <circle cx="18" cy="18" r="6.5" stroke="var(--blue)" strokeWidth="2" />
      <circle cx="18" cy="18" r="2.75" fill="var(--teal)" />
    </svg>
  );
}

export function RingLoader({ label = 'Reading...' }: { label?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="relative flex h-9 w-9 items-center justify-center">
        {prefersReducedMotion ? (
          <span className="absolute inset-1 rounded-full border border-[var(--amber)] opacity-70" />
        ) : (
          <>
            <motion.span
              className="absolute inset-0 rounded-full border border-[var(--amber)]"
              initial={{ scale: 0.45, opacity: 0.9 }}
              animate={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute inset-1.5 rounded-full border border-[var(--teal)]"
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 1.05, opacity: 0.15 }}
              transition={{ duration: 0.85, delay: 0.2, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
      </div>
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
    </div>
  );
}

export function RingEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="instrument-panel instrument-ticks flex flex-col items-center justify-center p-8 text-center">
      <RingLogo size={56} />
      <h3 className="mt-4 font-display text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1.5 max-w-md text-base text-[var(--muted)]">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-[44px] rounded-xl bg-[var(--amber)] px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 transition-transform active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function TrafficLightTag({ level }: { level: AlertLevel }) {
  const { t } = useDeepTier();

  const config: Record<
    AlertLevel,
    { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
  > = {
    safe: {
      label: t.alerts.safe,
      color: 'var(--risk-safe)',
      bg: 'color-mix(in srgb, var(--risk-safe) 12%, transparent)',
      border: 'color-mix(in srgb, var(--risk-safe) 35%, transparent)',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    watch: {
      label: t.alerts.watch,
      color: 'var(--risk-watch)',
      bg: 'color-mix(in srgb, var(--risk-watch) 12%, transparent)',
      border: 'color-mix(in srgb, var(--risk-watch) 38%, transparent)',
      icon: <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    warning: {
      label: t.alerts.warning,
      color: 'var(--risk-danger)',
      bg: 'color-mix(in srgb, var(--risk-danger) 14%, transparent)',
      border: 'color-mix(in srgb, var(--risk-danger) 42%, transparent)',
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    critical: {
      label: t.alerts.critical,
      color: 'var(--risk-urgent)',
      bg: 'color-mix(in srgb, var(--risk-urgent) 15%, transparent)',
      border: 'color-mix(in srgb, var(--risk-urgent) 45%, transparent)',
      icon: <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const c = config[level];

  return (
    <span
      style={{
        color: c.color,
        backgroundColor: c.bg,
        borderColor: c.border,
      }}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
}
