import React from 'react';
import type { NewsLanguage } from '../engine';

const SCRIPT_GLYPHS: Record<NewsLanguage, { glyph: string; name: string }> = {
  ta: { glyph: 'த', name: 'Tamil' },
  hi: { glyph: 'अ', name: 'Hindi' },
  te: { glyph: 'తె', name: 'Telugu' },
  kn: { glyph: 'ಕ', name: 'Kannada' },
  ml: { glyph: 'മ', name: 'Malayalam' },
  bn: { glyph: 'ব', name: 'Bengali' },
  mr: { glyph: 'म', name: 'Marathi' },
  en: { glyph: 'A', name: 'English' },
};

interface LanguageChipProps {
  code: NewsLanguage;
  active?: boolean;
  onClick?: () => void;
  labelOverride?: string;
}

export function LanguageChip({ code, active = false, onClick, labelOverride }: LanguageChipProps) {
  const info = SCRIPT_GLYPHS[code] ?? SCRIPT_GLYPHS.en;
  const label = labelOverride ?? info.name;

  if (!onClick) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <span className="font-semibold text-[var(--amber)]">{info.glyph}</span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
        active
          ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
          : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--muted)]'
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--navy)] border border-[var(--line)] text-xs font-bold text-[var(--amber)]"
      >
        {info.glyph}
      </span>
      <span>{label}</span>
    </button>
  );
}
