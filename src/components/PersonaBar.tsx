import React from 'react';
import { Compass, Factory, RotateCcw, Store } from 'lucide-react';
import { useDeepTier } from '../state/store';

export function PersonaBar() {
  const {
    persona,
    graph,
    selectDemoWorld,
    openWorldPicker,
    isWorldPickerOpen,
    resetDemoState,
    t,
  } = useDeepTier();

  return (
    <div className="border-b border-[var(--line)] bg-[var(--navy)]/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted)] mr-1">{t.persona.label}:</span>
          <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
            <button
              type="button"
              onClick={() => selectDemoWorld('shop')}
              aria-pressed={!isWorldPickerOpen && persona === 'shop'}
              className={`min-h-[44px] flex items-center gap-2 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
                !isWorldPickerOpen && persona === 'shop'
                  ? 'bg-[var(--navy)] text-[var(--text)] border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
              }`}
            >
              <Store className="h-4 w-4 text-[var(--teal)]" aria-hidden="true" />
              <span>{t.persona.shopTitle}</span>
            </button>
            <button
              type="button"
              onClick={() => selectDemoWorld('factory')}
              aria-pressed={!isWorldPickerOpen && persona === 'factory'}
              className={`min-h-[44px] flex items-center gap-2 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
                !isWorldPickerOpen && persona === 'factory'
                  ? 'bg-[var(--navy)] text-[var(--text)] border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
              }`}
            >
              <Factory className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
              <span>{t.persona.factoryTitle}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openWorldPicker}
            aria-pressed={isWorldPickerOpen}
            className={`min-h-[44px] flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
              isWorldPickerOpen
                ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
                : 'border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]'
            }`}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.controls.pickWorld}</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
          <span className="text-xs sm:text-sm text-[var(--muted)] truncate">
            {graph.business.businessName}, {graph.business.city}
          </span>
          <button
            type="button"
            onClick={resetDemoState}
            className="min-h-[44px] flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--amber)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
            <span>{t.controls.resetDemo}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
