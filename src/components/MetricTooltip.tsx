import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricTooltipProps {
  label: string;
  explanation: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Accessible plain-language metric explanation trigger (hover + focus + tap)
 * with a 44x44px hit zone and viewport-safe popover clamping on 360px screens.
 */
export function MetricTooltip({
  label,
  explanation,
  align = 'center',
}: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const [horizontalShift, setHorizontalShift] = useState<number>(0);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;

    const adjustPosition = () => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const rect = tip.getBoundingClientRect();
      const pad = 12;
      let shift = 0;
      if (rect.left < pad) {
        shift = pad - rect.left;
      } else if (rect.right > window.innerWidth - pad) {
        shift = window.innerWidth - pad - rect.right;
      }
      setHorizontalShift((prev) => (prev === shift ? prev : shift));
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    // Initial measurement after paint
    const raf = window.requestAnimationFrame(adjustPosition);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handleOutside);
    window.addEventListener('resize', adjustPosition);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handleOutside);
      window.removeEventListener('resize', adjustPosition);
    };
  }, [open]);

  const alignmentClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => {
        setHorizontalShift(0);
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setHorizontalShift(0);
          setOpen((prev) => !prev);
        }}
        onFocus={() => {
          setHorizontalShift(0);
          setOpen(true);
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex h-11 w-11 -my-3 -mx-2 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--amber)] focus-visible:outline-2 focus-visible:outline-[var(--amber)] transition-colors"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)]">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={
            horizontalShift !== 0
              ? { transform: `translateX(${horizontalShift}px)` }
              : undefined
          }
          className={`pointer-events-auto absolute bottom-full z-50 mb-2 w-60 max-w-[calc(100vw-24px)] rounded-xl border border-[var(--amber)]/50 bg-[var(--navy)] p-2.5 text-left text-xs font-normal leading-relaxed text-[var(--text)] shadow-xl ${alignmentClass}`}
        >
          {explanation}
        </span>
      )}
    </span>
  );
}
