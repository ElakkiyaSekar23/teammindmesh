import React, { useMemo, useState } from 'react';
import { Calendar, Play } from 'lucide-react';
import {
  getSeasonNote,
  SEASON_NOTES_SOUTH_INDIA,
  type RiskEventType,
} from '../engine';

interface SeasonWatchPanelProps {
  onTestRisk?: (type: RiskEventType) => void;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function inferRiskFromSeasonTags(tags: string[]): RiskEventType {
  const joined = tags.join(' ').toLowerCase();
  if (joined.includes('cyclone')) return 'cyclone';
  if (joined.includes('monsoon') || joined.includes('rain')) return 'flood';
  if (joined.includes('water')) return 'water_shortage';
  if (joined.includes('heat')) return 'heatwave';
  return 'transport_strike';
}

export function SeasonWatchPanel({ onTestRisk }: SeasonWatchPanelProps) {
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const activeSeasonNote = useMemo(() => getSeasonNote(selectedMonth), [selectedMonth]);

  return (
    <section
      aria-label="Season Watch"
      className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--amber)]">
            <Calendar className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text)]">
              Season Watch
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Month-by-month typical risks across Indian supplier corridors
            </p>
          </div>
        </div>

        <span className="inline-flex items-center self-start sm:self-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--amber)]">
          Typical pattern, not a forecast
        </span>
      </div>

      {/* Month-by-month 12-month strip */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
        {SEASON_NOTES_SOUTH_INDIA.map((note, idx) => {
          const monthNum = idx + 1;
          const isSelected = monthNum === selectedMonth;
          const isNow = monthNum === currentMonth;
          return (
            <button
              key={note.month}
              type="button"
              onClick={() => setSelectedMonth(monthNum)}
              aria-pressed={isSelected}
              className={`min-h-[44px] rounded-xl border px-1.5 py-1.5 text-center transition-colors ${
                isSelected
                  ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                  : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <div className="font-mono text-xs font-bold">{MONTH_SHORT[idx]}</div>
              {isNow && (
                <div className="text-[10px] font-semibold text-[var(--teal)]">Now</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected month details */}
      <div className="instrument-panel-raised p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase text-[var(--amber)]">
              {activeSeasonNote.monthName}
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--text)]">
              {activeSeasonNote.headline}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted)]">{activeSeasonNote.details}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {activeSeasonNote.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-[var(--line)] bg-[var(--navy)] px-2.5 py-0.5 text-xs font-medium text-[var(--text)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {onTestRisk && (
          <button
            type="button"
            onClick={() => onTestRisk(inferRiskFromSeasonTags(activeSeasonNote.tags))}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--amber)]/50 bg-[var(--amber)]/10 px-4 py-2 text-xs sm:text-sm font-bold text-[var(--amber)] hover:bg-[var(--amber)]/20 shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Test this month&apos;s risk</span>
          </button>
        )}
      </div>
    </section>
  );
}
