import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ExternalLink, Globe, RefreshCw } from 'lucide-react';
import { useDeepTier } from '../state/store';
import { RingLoader } from './RingMotif';

interface LiveWorldBannerProps {
  compact?: boolean;
}

export function LiveWorldBanner({ compact = false }: LiveWorldBannerProps) {
  const {
    graph,
    isCustomShopActive,
    liveWorldStatus,
    liveWorldError,
    liveWorldMeta,
    refreshLiveWorldAlerts,
  } = useDeepTier();

  const [showSources, setShowSources] = useState(false);

  const supplierCities = Array.from(
    new Set([graph.business.city, ...graph.suppliers.map((s) => s.city)]),
  );

  const formattedUpdatedAt = liveWorldMeta?.updatedAt
    ? new Date(liveWorldMeta.updatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (liveWorldStatus === 'loading') {
    return (
      <section aria-live="polite" className="surface-card p-3.5 sm:p-4">
        <RingLoader
          label={`Scanning live weather, roads & market feeds across ${graph.business.city} and ${supplierCities.length} chain cities...`}
        />
      </section>
    );
  }

  if (liveWorldStatus === 'error') {
    return (
      <section
        role="alert"
        className="surface-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-[var(--ember)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            {liveWorldError || 'Could not reach live feeds right now.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshLiveWorldAlerts()}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--amber)] px-4 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      </section>
    );
  }

  if (liveWorldMeta) {
    const modeLabel =
      liveWorldMeta.sourceMode === 'groq-live'
        ? 'Live weather & news (Groq AI)'
        : 'Live weather & news';

    return (
      <section aria-label="Live current world briefing" className="surface-card p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--teal)]">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{modeLabel}</span>
              </span>
              {formattedUpdatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formattedUpdatedAt}</span>
                </>
              )}
              {!compact && liveWorldMeta.sources.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setShowSources((v) => !v)}
                    aria-expanded={showSources}
                    className="inline-flex items-center gap-1 font-medium text-[var(--text)] hover:text-[var(--amber)]"
                  >
                    <span>{liveWorldMeta.sources.length} sources</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${showSources ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-[var(--text)] leading-snug">
              {liveWorldMeta.summary}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshLiveWorldAlerts()}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-semibold text-[var(--teal)] hover:border-[var(--teal)] shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {showSources && !compact && liveWorldMeta.sources.length > 0 && (
          <div className="border-t border-[var(--line)] pt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {liveWorldMeta.sources.slice(0, 6).map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--teal)] max-w-[260px]"
              >
                <span className="truncate">{src.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="surface-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--teal)]">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {isCustomShopActive
              ? `Ready to scan live conditions for ${graph.business.city}`
              : 'Live weather & market scan available'}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] truncate">
          {supplierCities.slice(0, 4).join(', ')}
          {supplierCities.length > 4 ? ` +${supplierCities.length - 4} cities` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void refreshLiveWorldAlerts()}
        className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)] shrink-0"
      >
        <Globe className="h-3.5 w-3.5 text-[var(--teal)]" aria-hidden="true" />
        <span>Check live world</span>
      </button>
    </section>
  );
}
