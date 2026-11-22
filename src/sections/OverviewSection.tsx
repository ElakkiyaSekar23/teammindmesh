import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { getSeasonNote, type AppRoute, type WhyExplanation } from '../engine';
import { useDeepTier } from '../state/store';
import { AlertDetailSheet } from '../components/AlertDetailSheet';
import { DaysLeftClock } from '../components/DaysLeftClock';
import { HiddenRiskMeter } from '../components/HiddenRiskMeter';
import { LiveWorldBanner } from '../components/LiveWorldBanner';
import { RingEmptyState, RingLoader } from '../components/RingMotif';
import { WhatsAppAlertBubble } from '../components/WhatsAppAlertBubble';

interface OverviewSectionProps {
  onNavigate: (route: AppRoute) => void;
  onExplain: (why: WhyExplanation) => void;
}

export function OverviewSection({ onNavigate, onExplain }: OverviewSectionProps) {
  const { graph, events, riskSummary, liveWorldStatus, t } = useDeepTier();
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const topImpact =
    riskSummary.impacts.find((i) => i.verifiedStatus === 'verified') ?? riskSummary.impacts[0];
  const topEvent = topImpact
    ? events.find((e) => e.id === topImpact.eventId)
    : events[0];

  const attentionCount = events.filter((ev) => {
    const imp = riskSummary.impacts.find((i) => i.eventId === ev.id);
    return imp && (imp.riskScore >= 25 || imp.assessment.exposedDays > 0);
  }).length;

  const attentionSentence =
    liveWorldStatus === 'loading' && events.length === 0
      ? `Scanning real-world news & weather for ${graph.business.city}...`
      : attentionCount === 0
        ? t.ui.everythingCalm
        : attentionCount === 1
          ? t.ui.oneThingNeedsAttention
          : `${attentionCount} ${t.ui.thingsNeedAttention}`;

  const seasonNote = getSeasonNote();

  const detailEvent = detailEventId
    ? events.find((e) => e.id === detailEventId) ?? null
    : null;
  const detailImpact = detailEvent
    ? riskSummary.impacts.find((i) => i.eventId === detailEvent.id) ?? null
    : null;
  const detailActions = detailEvent
    ? riskSummary.actions.filter((a) => a.eventId === detailEvent.id)
    : [];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Crisp Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-[var(--teal)]">
            {graph.business.businessKind} · {graph.business.city}, {graph.business.state}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            {graph.business.businessName}
          </h1>
        </div>
        <p className="text-sm font-medium text-[var(--amber)]">{attentionSentence}</p>
      </div>

      {/* Live Real-World Briefing */}
      <LiveWorldBanner />

      {/* Balanced 2-Column KPI Summary */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DaysLeftClock
            impact={topImpact}
            event={topEvent}
            onExplain={onExplain}
            onPrimaryAction={() => onNavigate('actions')}
            primaryActionLabel={t.sections.actionsHeading}
          />
        </div>
        <div className="lg:col-span-5">
          <HiddenRiskMeter riskSummary={riskSummary} onExplain={onExplain} />
        </div>
      </div>

      {/* Live Alerts Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
            {t.sections.newsWatchHeading}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('news-watch')}
            className="min-h-[44px] inline-flex items-center rounded-lg px-2 text-xs font-semibold text-[var(--teal)] hover:underline"
          >
            {t.ui.checkAnotherMessage}
          </button>
        </div>

        {events.length === 0 ? (
          liveWorldStatus === 'loading' ? (
            <div className="surface-card p-6 flex justify-center">
              <RingLoader label={`Fetching live news for ${graph.business.city}...`} />
            </div>
          ) : (
            <RingEmptyState
              title={t.ui.everythingCalm}
              subtitle={t.sections.noTroublesYet}
              actionLabel={t.ui.checkLocalNewsCta}
              onAction={() => onNavigate('news-watch')}
            />
          )
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const eventImpact =
                riskSummary.impacts.find((i) => i.eventId === ev.id) ?? null;
              return (
                <WhatsAppAlertBubble
                  key={ev.id}
                  event={ev}
                  impact={eventImpact}
                  onOpenDetail={() => setDetailEventId(ev.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Quiet Seasonal Note */}
      <div className="surface-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar className="h-4 w-4 text-[var(--blue)] shrink-0" aria-hidden="true" />
          <div className="truncate">
            <span className="font-semibold text-[var(--text)]">
              Season Watch ({seasonNote.monthName}):
            </span>{' '}
            <span className="text-[var(--muted)]">{seasonNote.headline}</span>
          </div>
        </div>
        <span className="text-[var(--muted)] shrink-0">
          {seasonNote.tags.join(' · ')}
        </span>
      </div>

      <AlertDetailSheet
        event={detailEvent}
        impact={detailImpact}
        actions={detailActions}
        onClose={() => setDetailEventId(null)}
      />
    </div>
  );
}
