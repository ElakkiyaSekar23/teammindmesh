import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { WhyExplanation } from '../engine';
import { useDeepTier } from '../state/store';

interface WhyModalProps {
  explanation: WhyExplanation | null;
  onClose: () => void;
}

export function WhyModal({ explanation, onClose }: WhyModalProps) {
  const { judgesMode, t } = useDeepTier();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!explanation) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [explanation, onClose]);

  if (!explanation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="instrument-panel instrument-ticks w-full max-w-lg p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
          <h2 id="why-modal-title" className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
            {explanation.label} — {t.controls.whyButton}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.controls.close}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ol className="mt-4 space-y-3 text-base leading-relaxed text-[var(--text)]">
          {explanation.sentences.map((sentence, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="font-mono text-xs font-bold text-[var(--amber)] pt-1.5 tabular-nums">
                0{idx + 1}.
              </span>
              <span>{sentence}</span>
            </li>
          ))}
        </ol>

        {judgesMode && (
          <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-xs text-[var(--text)]">
            <div className="font-semibold text-[var(--amber)] mb-1">
              Deterministic Formula (For Judges)
            </div>
            <code className="block font-mono text-[11px] text-[var(--text)] break-words">
              {explanation.formula}
            </code>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
              {Object.entries(explanation.inputs).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-2 border-b border-[var(--line)] py-0.5"
                >
                  <span className="text-[var(--muted)]">{k}</span>
                  <span className="font-semibold text-[var(--text)]">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl bg-[var(--amber)] px-5 py-2 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]"
          >
            {t.controls.close}
          </button>
        </div>
      </div>
    </div>
  );
}
