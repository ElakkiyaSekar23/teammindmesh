import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Compass, Disc } from 'lucide-react';
import type { SupplierNode, SupplyChainGraph } from '../engine';
import { useDeepTier } from '../state/store';

interface ConcentricChainVizProps {
  graph: SupplyChainGraph;
  outerRingsDiscovered: boolean;
  onSelectSupplier: (supplier: SupplierNode | null) => void;
  selectedSupplierId: string | null;
}

interface PositionedSupplier {
  supplier: SupplierNode;
  x: number;
  y: number;
}

// Simplified India coastline polygon for D3 geoMercator context
const INDIA_OUTLINE_COORDS: Array<[number, number]> = [
  [68.2, 23.8],
  [70.1, 22.8],
  [69.0, 22.2],
  [72.6, 21.4],
  [72.8, 19.1],
  [73.4, 16.0],
  [74.8, 12.9],
  [76.2, 9.9],
  [77.5, 8.1],
  [79.2, 9.3],
  [80.3, 13.1],
  [82.2, 16.9],
  [85.0, 19.8],
  [87.5, 21.5],
  [88.8, 22.2],
  [88.2, 25.2],
  [85.0, 26.8],
  [81.0, 28.8],
  [77.2, 30.8],
  [74.8, 32.2],
  [70.5, 27.0],
  [68.2, 23.8],
];

export function ConcentricChainViz({
  graph,
  outerRingsDiscovered,
  onSelectSupplier,
  selectedSupplierId,
}: ConcentricChainVizProps) {
  const { t, riskSummary } = useDeepTier();
  const [viewMode, setViewMode] = useState<'rings' | 'map'>('rings');

  const width = 620;
  const height = 440;
  const cx = width / 2;
  const cy = height / 2;

  const ringRadii = { 1: 78, 2: 140, 3: 196 };

  // Compute radial force-settled positions using D3
  const ringPositions = useMemo(() => {
    const byId = new Map<string, PositionedSupplier>();

    type SimDatum = d3.SimulationNodeDatum & {
      id: string;
      layer: number;
      supplier?: SupplierNode;
    };

    const nodes: SimDatum[] = [
      { id: 'YOU', layer: 0, fx: cx, fy: cy },
      ...graph.suppliers.map((s, idx) => {
        const angle = (idx / Math.max(1, graph.suppliers.length)) * Math.PI * 2;
        const r = ringRadii[s.layer];
        return {
          id: s.id,
          layer: s.layer,
          supplier: s,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        };
      }),
    ];

    const simulation = d3
      .forceSimulation<SimDatum>(nodes)
      .force(
        'radial',
        d3
          .forceRadial<SimDatum>(
            (d) => (d.layer === 0 ? 0 : ringRadii[d.layer as 1 | 2 | 3]),
            cx,
            cy,
          )
          .strength(0.95),
      )
      .force('collide', d3.forceCollide<SimDatum>(32))
      .stop();

    for (let i = 0; i < 140; i++) {
      simulation.tick();
    }

    nodes.forEach((n) => {
      if (n.supplier) {
        byId.set(n.id, {
          supplier: n.supplier,
          x: n.x ?? cx,
          y: n.y ?? cy,
        });
      }
    });

    return byId;
  }, [graph.suppliers]);

  // Compute D3 geoMercator projection for India map view
  const geoData = useMemo(() => {
    const projection = d3
      .geoMercator()
      .center([79.0, 17.8])
      .scale(980)
      .translate([width / 2, height / 2]);

    const lineGen = d3.line<[number, number]>().curve(d3.curveLinearClosed);
    const projectedOutline: Array<[number, number]> = INDIA_OUTLINE_COORDS.map(
      (pt) => projection(pt) ?? [0, 0],
    );
    const outlinePath = lineGen(projectedOutline) ?? '';

    const youPt = projection([graph.business.lng, graph.business.lat]) ?? [cx, cy];
    const supPts = new Map<string, [number, number]>();
    graph.suppliers.forEach((s) => {
      supPts.set(s.id, projection([s.lng, s.lat]) ?? [cx, cy]);
    });

    return { outlinePath, youPt, supPts };
  }, [graph]);

  const impactedSupplierIds = useMemo(
    () => new Set(riskSummary.impacts.map((imp) => imp.sourceSupplierId)),
    [riskSummary.impacts],
  );

  const getCoord = (id: string): [number, number] => {
    if (viewMode === 'map') {
      if (id === 'YOU') return geoData.youPt;
      return geoData.supPts.get(id) ?? geoData.youPt;
    }
    if (id === 'YOU') return [cx, cy];
    const pos = ringPositions.get(id);
    return pos ? [pos.x, pos.y] : [cx, cy];
  };

  const layerColor = (layer: 1 | 2 | 3) =>
    layer === 1 ? 'var(--blue)' : layer === 2 ? 'var(--amber)' : 'var(--ember)';

  return (
    <div className="instrument-panel instrument-ticks p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
            <span>{t.layers.you}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--blue)]" />
            <span>{t.layers.layer1}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
            <span>{t.layers.layer2}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--ember)]" />
            <span>{t.layers.layer3}</span>
          </span>
        </div>

        <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
          <button
            type="button"
            onClick={() => setViewMode('rings')}
            aria-pressed={viewMode === 'rings'}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
              viewMode === 'rings'
                ? 'bg-[var(--navy)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Disc className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Rings</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            aria-pressed={viewMode === 'map'}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
              viewMode === 'map'
                ? 'bg-[var(--navy)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>India Map</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[440px] block"
          role="img"
          aria-label={t.sections.chainMapHeading}
        >
          {viewMode === 'rings' ? (
            <g>
              {/* Concentric rings */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={ringRadii[3]}
                fill="none"
                stroke="var(--ember)"
                strokeWidth="1.25"
                strokeDasharray={outerRingsDiscovered ? 'none' : '5 5'}
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: outerRingsDiscovered ? 0.55 : 0.25,
                }}
                transition={{ duration: 0.75 }}
              />
              <motion.circle
                cx={cx}
                cy={cy}
                r={ringRadii[2]}
                fill="none"
                stroke="var(--amber)"
                strokeWidth="1.25"
                strokeDasharray={outerRingsDiscovered ? 'none' : '4 4'}
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: outerRingsDiscovered ? 0.65 : 0.35,
                }}
                transition={{ duration: 0.65 }}
              />
              <motion.circle
                cx={cx}
                cy={cy}
                r={ringRadii[1]}
                fill="none"
                stroke="var(--blue)"
                strokeWidth="1.5"
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                transition={{ duration: 0.55 }}
              />
            </g>
          ) : (
            <path
              d={geoData.outlinePath}
              fill="var(--panel)"
              fillOpacity="0.45"
              stroke="var(--line)"
              strokeWidth="1.5"
            />
          )}

          {/* SUPPLIES links */}
          {graph.links.map((link) => {
            const [x1, y1] = getCoord(link.fromId);
            const [x2, y2] = getCoord(link.toId);
            const fromSup = graph.suppliers.find((s) => s.id === link.fromId);
            const isFoggy = fromSup && fromSup.layer > 1 && !outerRingsDiscovered && !fromSup.verified;
            const isTrouble = fromSup && impactedSupplierIds.has(fromSup.id);

            return (
              <line
                key={link.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isTrouble ? 'var(--risk-urgent)' : 'var(--muted)'}
                strokeOpacity={isFoggy ? 0.25 : isTrouble ? 0.85 : 0.45}
                strokeWidth={isTrouble ? 2 : 1.25}
                strokeDasharray={isFoggy ? '3 3' : undefined}
              />
            );
          })}

          {/* Supplier markers */}
          {graph.suppliers.map((sup) => {
            const [x, y] = getCoord(sup.id);
            const isSelected = selectedSupplierId === sup.id;
            const isImpacted = impactedSupplierIds.has(sup.id);
            const isFoggy = sup.layer > 1 && !outerRingsDiscovered && !sup.verified;
            const color = isImpacted ? 'var(--risk-urgent)' : layerColor(sup.layer);

            return (
              <g
                key={sup.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() => onSelectSupplier(sup)}
                role="button"
                tabIndex={0}
                aria-label={`${sup.name}, ${sup.city}, ${sup.stockDays} stock days`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSupplier(sup);
                  }
                }}
              >
                <circle
                  r={isSelected ? 15 : 11}
                  fill="var(--navy)"
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={isFoggy ? 0.52 : 1}
                />
                {sup.isSingleSource && (
                  <circle
                    r={16}
                    fill="none"
                    stroke="var(--amber)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.85"
                  />
                )}
                <text
                  y={24}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="10"
                  fontWeight="600"
                  opacity={isFoggy ? 0.6 : 0.95}
                >
                  {sup.city}
                </text>
              </g>
            );
          })}

          {/* Center: YOU */}
          {(() => {
            const [yx, yy] = getCoord('YOU');
            return (
              <g
                transform={`translate(${yx}, ${yy})`}
                className="cursor-pointer"
                onClick={() => onSelectSupplier(null)}
              >
                <circle r={19} fill="var(--teal)" fillOpacity="0.18" />
                <circle r={12} fill="var(--teal)" stroke="var(--ink)" strokeWidth="2.5" />
                <text
                  y={30}
                  textAnchor="middle"
                  fill="var(--teal)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {t.layers.you}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
