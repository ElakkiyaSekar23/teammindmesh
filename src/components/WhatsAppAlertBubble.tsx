import React, { useState } from 'react';
import {
  ChevronRight,
  ExternalLink,
  MessageCircle,
  MessageCircleWarning,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { RippleImpact, TroubleEvent } from '../engine';
import { useDeepTier } from '../state/store';
import { buildWhatsAppShareUrl, formatSourceLabel } from './AlertDetailSheet';
import { LanguageChip } from './LanguageChip';
import { TrafficLightTag } from './RingMotif';
import { getRiskTypeLabel, RiskTypeIcon } from './RiskTypeIcon';

interface WhatsAppAlertBubbleProps {
  event: TroubleEvent;
  impact?: RippleImpact | null;
  onOpenDetail?: () => void;
  onTraceRipple?: () => void;
}

export function WhatsAppAlertBubble({
  event,
  impact = null,
  onOpenDetail,
  onTraceRipple,
}: WhatsAppAlertBubbleProps) {
  const { t, language, graph } = useDeepTier();
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isForward = event.verifiedStatus === 'unverified';
  const sourceLabel = formatSourceLabel(event.sourceKind, t);
  const waUrl = buildWhatsAppShareUrl(event, impact, graph.business.businessName);

  const layerName = impact
    ? impact.sourceLayer === 1
      ? t.layers.layer1
      : impact.sourceLayer === 2
        ? t.layers.layer2
        : t.layers.layer3
    : '';

  const handleSpeak = () => {
    setSpeechError(null);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError(t.ui.ttsNotSupported);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`${event.title}. ${event.plainSummary}`);
    utter.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => {
      setSpeaking(false);
      setSpeechError(t.ui.ttsNotSupported);
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  return (
    <article
      className={`surface-card p-4 sm:p-5 space-y-3 ${
        isForward ? 'border-[var(--risk-watch)]/40' : ''
      }`}
    >
      {/* Clean unboxed typographic metadata strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-[var(--muted)]">
          <LanguageChip code={event.language} />
          <span aria-hidden="true">·</span>
          <span className={isForward ? 'font-semibold text-[var(--risk-watch)]' : 'font-medium text-[var(--teal)]'}>
            {sourceLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-[var(--text)] font-medium">
            <RiskTypeIcon type={event.type} className="h-3.5 w-3.5 text-[var(--amber)]" />
            <span>{getRiskTypeLabel(event.type)}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{event.region}</span>
        </div>

        <TrafficLightTag level={impact?.alertLevel ?? (isForward ? 'watch' : 'safe')} />
      </div>

      {/* Main Content Body (clickable when detail handler provided) */}
      {onOpenDetail ? (
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={`${event.title}. ${t.controls.tapForDetails}`}
          className="block w-full text-left space-y-1.5 group"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text)] group-hover:text-[var(--amber)] transition-colors">
              {event.title}
            </h3>
            {impact ? (
              <span className="font-mono text-xs font-bold text-[var(--amber)] tabular-nums shrink-0">
                {impact.daysToImpact} {t.controls.daysUntilHurtsLabel}
              </span>
            ) : (
              <span className="font-mono text-xs text-[var(--teal)] shrink-0">
                Low chain impact
              </span>
            )}
          </div>

          {impact && (
            <div className="text-xs font-medium text-[var(--teal)]">
              {impact.sourceSupplierName} · {layerName}
            </div>
          )}

          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {event.plainSummary}
          </p>

          {isForward && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--risk-watch)]">
              <MessageCircleWarning className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.alerts.rumourCapNote}</span>
            </div>
          )}
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text)]">
              {event.title}
            </h3>
            {impact && (
              <span className="font-mono text-xs font-bold text-[var(--amber)] tabular-nums shrink-0">
                {impact.daysToImpact} {t.controls.daysUntilHurtsLabel}
              </span>
            )}
          </div>
          {impact && (
            <div className="text-xs font-medium text-[var(--teal)]">
              {impact.sourceSupplierName} · {layerName}
            </div>
          )}
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {event.plainSummary}
          </p>
        </div>
      )}

      {speechError && (
        <p role="status" className="text-xs text-[var(--risk-watch)]">
          {speechError}
        </p>
      )}

      {/* Clean single-row actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSpeak}
            aria-pressed={speaking}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-medium text-[var(--text)] hover:border-[var(--amber)]"
          >
            {speaking ? (
              <VolumeX className="h-3.5 w-3.5 text-[var(--risk-urgent)]" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[var(--teal)]" aria-hidden="true" />
            )}
            <span>{speaking ? t.controls.stopListening : t.controls.listenAloud}</span>
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-medium text-[var(--teal)] hover:border-[var(--teal)]"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.controls.shareWhatsApp}</span>
          </a>

          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
            >
              <span>Source</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="min-h-[44px] inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--amber)] hover:underline"
            >
              <span>{t.controls.tapForDetails}</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {onTraceRipple && (
            <button
              type="button"
              onClick={onTraceRipple}
              className="min-h-[44px] rounded-lg bg-[var(--amber)] px-3.5 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105"
            >
              See ripple
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
