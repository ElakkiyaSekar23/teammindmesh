import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCw } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

interface RadarDot {
  id: string;
  name: string;
  city: string;
  layer: 1 | 2 | 3;
  item: string;
  angleDeg: number;
}

const RADAR_DOTS: RadarDot[] = [
  // Layer 1 (radius 68)
  { id: 'r-l1-1', name: 'Local Milk Booth', city: 'Chennai', layer: 1, item: 'Fresh milk', angleDeg: -35 },
  { id: 'r-l1-2', name: 'Tea Leaf Agency', city: 'Chennai', layer: 1, item: 'Tea powder', angleDeg: 55 },
  { id: 'r-l1-3', name: 'Parrys Sugar Mart', city: 'Chennai', layer: 1, item: 'Sugar sacks', angleDeg: 145 },
  { id: 'r-l1-4', name: 'Commercial LPG', city: 'Chennai', layer: 1, item: '19kg gas', angleDeg: 225 },
  // Layer 2 (radius 114)
  { id: 'r-l2-1', name: 'Vellore Dairy Co-op', city: 'Vellore', layer: 2, item: 'Chilled farm milk', angleDeg: -25 },
  { id: 'r-l2-2', name: 'Nilgiri Blending Mill', city: 'Coimbatore', layer: 2, item: 'Packed tea', angleDeg: 65 },
  { id: 'r-l2-3', name: 'Kolhapur Sugar Mill', city: 'Kolhapur', layer: 2, item: 'Crystal sugar', angleDeg: 155 },
  { id: 'r-l2-4', name: 'Ennore Bottling Plant', city: 'Chennai', layer: 2, item: 'Filled cylinders', angleDeg: 240 },
  // Layer 3 (radius 158)
  { id: 'r-l3-1', name: 'Erode Cattle-Feed Mill', city: 'Erode', layer: 3, item: 'Dairy cattle feed', angleDeg: -15 },
  { id: 'r-l3-2', name: 'Coonoor Tea Estates', city: 'Coonoor', layer: 3, item: 'Green tea leaves', angleDeg: 75 },
  { id: 'r-l3-3', name: 'Mandya Cane Growers', city: 'Mandya', layer: 3, item: 'Raw sugarcane', angleDeg: 165 },
  { id: 'r-l3-4', name: 'Mangalore Gas Port', city: 'Mangalore', layer: 3, item: 'Imported gas', angleDeg: 255 },
];

const LAYER_RING_RADIUS: Record<1 | 2 | 3, number> = {
  1: 68,
  2: 114,
  3: 158,
};

const LAYER_COLOR: Record<1 | 2 | 3, string> = {
  1: 'var(--blue)',
  2: 'var(--amber)',
  3: 'var(--ember)',
};

const LAYER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Your suppliers',
  2: 'Their suppliers',
  3: "Their suppliers' suppliers",
};

export function LandingRadar() {
  const { t } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [sharpened, setSharpened] = useState(prefersReducedMotion);
  const [selectedDot, setSelectedDot] = useState<RadarDot>(RADAR_DOTS[8]); // Default focus on Erode Cattle-Feed Mill

  useEffect(() => {
    if (prefersReducedMotion) {
      setSharpened(true);
      return;
    }
    const timer = window.setTimeout(() => setSharpened(true), 220);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  const handleReplay = () => {
    if (prefersReducedMotion) {
      setSharpened(true);
      return;
    }
    setSharpened(false);
    window.setTimeout(() => setSharpened(true), 180);
  };

  const cx = 190;
  const cy = 190;

  return (
    <div className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--teal)]">
          Interactive chain radar · Tap any supplier dot
        </div>
        <button
          type="button"
          onClick={handleReplay}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)]"
        >
          <RotateCw className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
          <span>{t.ui.replay}</span>
        </button>
      </div>

      <div className="relative mx-auto flex items-center justify-center max-w-[380px]">
        <svg
          viewBox="0 0 380 380"
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Concentric supply chain radar showing you at the center and three supplier rings moving outward"
        >
          <defs>
            <filter id="landing-fog-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
          </defs>

          {/* Subtle crosshair */}
          <line
            x1={cx}
            y1={20}
            x2={cx}
            y2={360}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
          <line
            x1={20}
            y1={cy}
            x2={360}
            y2={cy}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />

          {/* Ring 3: outer layer (foggy -> sharp) */}
          <motion.g
            initial={false}
            animate={{ opacity: sharpened ? 1 : 0.28 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            filter={sharpened ? undefined : 'url(#landing-fog-blur)'}
          >
            <circle
              cx={cx}
              cy={cy}
              r={LAYER_RING_RADIUS[3]}
              fill="none"
              stroke="var(--ember)"
              strokeOpacity={sharpened ? 0.55 : 0.25}
              strokeWidth={1.5}
              strokeDasharray={sharpened ? 'none' : '6 6'}
            />
          </motion.g>

          {/* Ring 2: middle layer (foggy -> sharp) */}
          <motion.g
            initial={false}
            animate={{ opacity: sharpened ? 1 : 0.42 }}
            transition={{ duration: 0.55 }}
            filter={sharpened ? undefined : 'url(#landing-fog-blur)'}
          >
            <circle
              cx={cx}
              cy={cy}
              r={LAYER_RING_RADIUS[2]}
              fill="none"
              stroke="var(--amber)"
              strokeOpacity={sharpened ? 0.65 : 0.3}
              strokeWidth={1.5}
              strokeDasharray={sharpened ? 'none' : '5 5'}
            />
          </motion.g>

          {/* Ring 1: direct suppliers (always sharp) */}
          <circle
            cx={cx}
            cy={cy}
            r={LAYER_RING_RADIUS[1]}
            fill="none"
            stroke="var(--blue)"
            strokeOpacity={0.75}
            strokeWidth={1.5}
          />

          {/* Link spokes from selected dot chain */}
          {RADAR_DOTS.map((dot) => {
            const rad = (dot.angleDeg * Math.PI) / 180;
            const r = LAYER_RING_RADIUS[dot.layer];
            const x = cx + Math.cos(rad) * r;
            const y = cy + Math.sin(rad) * r;
            const isSelected = selectedDot.id === dot.id;

            return (
              <g key={dot.id}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={isSelected ? LAYER_COLOR[dot.layer] : 'var(--line)'}
                  strokeOpacity={isSelected ? 0.85 : 0.3}
                  strokeWidth={isSelected ? 1.8 : 1}
                />
              </g>
            );
          })}

          {/* Supplier dots */}
          {RADAR_DOTS.map((dot, idx) => {
            const rad = (dot.angleDeg * Math.PI) / 180;
            const r = LAYER_RING_RADIUS[dot.layer];
            const x = cx + Math.cos(rad) * r;
            const y = cy + Math.sin(rad) * r;
            const isSelected = selectedDot.id === dot.id;
            const color = LAYER_COLOR[dot.layer];
            const visible = dot.layer === 1 || sharpened;

            return (
              <motion.g
                key={dot.id}
                role="button"
                tabIndex={0}
                aria-label={`${dot.name}, ${dot.city}, ${LAYER_LABEL[dot.layer]}, supplies ${dot.item}`}
                aria-pressed={isSelected}
                initial={false}
                animate={{
                  opacity: visible ? 1 : 0.25,
                  scale: visible ? 1 : 0.65,
                }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.45,
                  delay: prefersReducedMotion
                    ? 0
                    : dot.layer === 1
                      ? 0
                      : dot.layer === 2
                        ? 0.1 + idx * 0.02
                        : 0.25 + idx * 0.02,
                }}
                style={{ transformOrigin: `${x}px ${y}px` }}
                className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
                onClick={() => setSelectedDot(dot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDot(dot);
                  }
                }}
              >
                <circle cx={x} cy={y} r={22} fill="transparent" />
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={13}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : 6.5}
                  fill={color}
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
                <title>{`${dot.name} (${dot.city}) - ${LAYER_LABEL[dot.layer]}`}</title>
              </motion.g>
            );
          })}

          {/* Center business dot: YOU */}
          <circle
            cx={cx}
            cy={cy}
            r={22}
            fill="var(--teal)"
            fillOpacity={0.14}
            stroke="var(--teal)"
            strokeWidth={1.5}
          />
          <circle cx={cx} cy={cy} r={11} fill="var(--teal)" />
          <text
            x={cx}
            y={cy + 34}
            textAnchor="middle"
            className="fill-[var(--text)] text-[11px] font-bold"
          >
            YOU
          </text>
        </svg>
      </div>

      {/* Selected supplier readout + legend */}
      <div className="instrument-panel-raised p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div>
          <span
            className="font-semibold"
            style={{ color: LAYER_COLOR[selectedDot.layer] }}
          >
            {LAYER_LABEL[selectedDot.layer]}
          </span>
          <span className="text-[var(--muted)]"> · {selectedDot.city}</span>
          <div className="font-display text-sm font-bold text-[var(--text)] mt-0.5">
            {selectedDot.name}
          </div>
        </div>
        <div className="font-mono text-xs text-[var(--teal)] shrink-0">
          {selectedDot.item}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
          <span>You</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--blue)]" />
          <span>Your suppliers</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
          <span>Their suppliers</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--ember)]" />
          <span>Their suppliers&apos; suppliers</span>
        </span>
      </div>
    </div>
  );
}
