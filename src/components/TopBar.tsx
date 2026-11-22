import React from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import type { AppRoute, UiLanguage } from '../engine';
import { useDeepTier } from '../state/store';
import { RingLogo } from './RingMotif';

interface TopBarProps {
  onNavigate: (route: AppRoute) => void;
}

const LANG_OPTIONS: Array<{ code: UiLanguage; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिं' },
];

export function TopBar({ onNavigate }: TopBarProps) {
  const {
    language,
    setLanguage,
    theme,
    toggleTheme,
    graph,
    openWorldPicker,
    closeWorldPicker,
    t,
  } = useDeepTier();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--line)] bg-[var(--navy)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              closeWorldPicker();
              onNavigate('landing');
            }}
            className="flex min-h-[44px] items-center gap-2 font-display text-base sm:text-lg font-bold tracking-tight text-[var(--text)] whitespace-nowrap shrink-0"
          >
            <RingLogo size={22} />
            <span>{t.brandName}</span>
          </a>

          <span aria-hidden="true" className="hidden sm:inline text-[var(--line)]">
            /
          </span>

          <button
            type="button"
            onClick={openWorldPicker}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-2 text-xs sm:text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] truncate transition-colors"
            title={t.controls.pickWorld}
          >
            <span className="font-semibold text-[var(--text)] truncate max-w-[130px] sm:max-w-[220px]">
              {graph.business.businessName}
            </span>
            <span className="hidden sm:inline text-[var(--muted)]">
              · {graph.business.city}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            role="group"
            aria-label={t.controls.languageLabel}
            className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5"
          >
            {LANG_OPTIONS.map((opt) => {
              const active = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLanguage(opt.code)}
                  aria-pressed={active}
                  className={`min-h-[44px] min-w-[36px] px-2 sm:px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--navy)] text-[var(--text)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.controls.themeLight : t.controls.themeDark}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
