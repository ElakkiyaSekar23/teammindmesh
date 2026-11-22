import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Columns3, Minus, Plus, RotateCcw } from 'lucide-react';
import * as d3 from 'd3';
import {
  findSupplyChain,
  type AlertLevel,
  type SupplierLayer,
  type SupplierNode,
  type SupplyChainGraph,
} from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

export interface ChainMapFilters {
  layer: SupplierLayer | 'all';
  light: AlertLevel | 'all';
  noBackupOnly: boolean;
}

export interface WeakSpotItem {
  supplier: SupplierNode;
  daysToHurt: number;
}

interface ChainMapCanvasProps {
  graph: SupplyChainGraph;
  outerRingsDiscovered: boolean;
  selectedSupplierId: string | null;
  onSelectSupplier: (supplier: SupplierNode | null) => void;
  filters: ChainMapFilters;
  weakSpotIds: Set<string>;
  showWeakSpots: boolean;
}

const CANVAS_W = 940;
const CANVAS_H = 520;

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

const LIGHT_COLOR_VAR: Record<AlertLevel, string> = {
  safe: 'var(--risk-safe)',
  watch: 'var(--risk-watch)',
  warning: 'var(--risk-danger)',
  critical: 'var(--risk-urgent)',
};

const ALERT_RANK: Record<AlertLevel, number> = {
  safe: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

export function ChainMapCanvas({
  graph,
  outerRingsDiscovered,
  selectedSupplierId,
  onSelectSupplier,
  filters,
  weakSpotIds,
  showWeakSpots,
}: ChainMapCanvasProps) {
  const { t, riskSummary } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [viewMode, setViewMode] = useState<'columns' | 'india'>('columns');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Highest traffic light per supplier from live engine impacts
  const supplierLightMap = useMemo(() => {
    const map = new Map<string, AlertLevel>();
    graph.suppliers.forEach((s) => map.set(s.id, 'safe'));
    for (const imp of riskSummary.impacts) {
      for (const step of imp.path) {
        if (step.supplierId === 'YOU') continue;
        const cur = map.get(step.supplierId) ?? 'safe';
        // Direct affected supplier carries full alertLevel; downstream carries at least watch/impact level
        const nextLevel =
          step.supplierId === imp.sourceSupplierId
            ? imp.alertLevel
            : imp.alertLevel === 'critical'
              ? 'warning'
              : imp.alertLevel;
        if (ALERT_RANK[nextLevel] > ALERT_RANK[cur]) {
          map.set(step.supplierId, nextLevel);
        }
      }
    }
    return map;
  }, [graph.suppliers, riskSummary.impacts]);

  // Compute left-to-right column positions aligned by downstream chain lanes
  const columnPositions = useMemo(() => {
    const byId = new Map<string, { x: number; y: number; supplier?: SupplierNode }>();
    const colX = { 0: 105, 1: 335, 2: 580, 3: 825 };
    byId.set('YOU', { x: colX[0], y: CANVAS_H / 2 });

    const l1 = graph.suppliers.filter((s) => s.layer === 1);
    const l2 = graph.suppliers.filter((s) => s.layer === 2);
    const l3 = graph.suppliers.filter((s) => s.layer === 3);

    const placeColumn = (nodes: SupplierNode[], colIndex: 1 | 2 | 3) => {
      // Order by downstream target Y so curved links stay parallel and tidy
      const sorted = [...nodes].sort((a, b) => {
        const linkA = graph.links.find((l) => l.fromId === a.id);
        const linkB = graph.links.find((l) => l.fromId === b.id);
        const yA = linkA ? byId.get(linkA.toId)?.y ?? CANVAS_H / 2 : CANVAS_H / 2;
        const yB = linkB ? byId.get(linkB.toId)?.y ?? CANVAS_H / 2 : CANVAS_H / 2;
        if (yA !== yB) return yA - yB;
        return a.name.localeCompare(b.name);
      });

      const topPad = 86;
      const bottomPad = 60;
      const usableH = CANVAS_H - topPad - bottomPad;
      const count = sorted.length;

      sorted.forEach((sup, idx) => {
        const y =
          count === 1
            ? CANVAS_H / 2
            : topPad + (idx / Math.max(1, count - 1)) * usableH;
        byId.set(sup.id, { x: colX[colIndex], y, supplier: sup });
      });
    };

    placeColumn(l1, 1);
    placeColumn(l2, 2);
    placeColumn(l3, 3);

    return byId;
  }, [graph.links, graph.suppliers]);

  // India Geo projection coordinates (secondary map mode)
  const indiaGeo = useMemo(() => {
    const projection = d3
      .geoMercator()
      .center([79.0, 17.8])
      .scale(1050)
      .translate([CANVAS_W / 2, CANVAS_H / 2]);

    const lineGen = d3.line<[number, number]>().curve(d3.curveLinearClosed);
    const projectedOutline: Array<[number, number]> = INDIA_OUTLINE_COORDS.map(
      (pt) => projection(pt) ?? [0, 0],
    );
    const outlinePath = lineGen(projectedOutline) ?? '';
    const youPt = projection([graph.business.lng, graph.business.lat]) ?? [
      CANVAS_W / 2,
      CANVAS_H / 2,
    ];
    const supPts = new Map<string, [number, number]>();
    graph.suppliers.forEach((s) => {
      supPts.set(s.id, projection([s.lng, s.lat]) ?? youPt);
    });
    return { outlinePath, youPt, supPts };
  }, [graph]);

  const getCoord = (id: string): [number, number] => {
    if (viewMode === 'india') {
      if (id === 'YOU') return indiaGeo.youPt;
      return indiaGeo.supPts.get(id) ?? indiaGeo.youPt;
    }
    const pos = columnPositions.get(id);
    return pos ? [pos.x, pos.y] : [105, CANVAS_H / 2];
  };

  // Highlighted path from selected supplier -> ... -> YOU
  const activePathData = useMemo(() => {
    const nodeIds = new Set<string>();
    const linkIds = new Set<string>();
    if (!selectedSupplierId) return { nodeIds, linkIds };

    const chain = findSupplyChain(graph, selectedSupplierId);
    if (chain.length === 0) {
      nodeIds.add(selectedSupplierId);
      return { nodeIds, linkIds };
    }

    nodeIds.add('YOU');
    chain.forEach((n) => nodeIds.add(n.id));
    for (let i = 0; i < chain.length; i++) {
      const fromId = chain[i].id;
      const toId = i < chain.length - 1 ? chain[i + 1].id : 'YOU';
      const matchingLink = graph.links.find(
        (l) => l.fromId === fromId && l.toId === toId,
      );
      if (matchingLink) linkIds.add(matchingLink.id);
    }
    return { nodeIds, linkIds };
  }, [graph, selectedSupplierId]);

  // Filter visibility check
  const hasAnyFilter =
    filters.layer !== 'all' || filters.light !== 'all' || filters.noBackupOnly;

  const matchesFilter = (sup: SupplierNode): boolean => {
    if (filters.layer !== 'all' && sup.layer !== filters.layer) return false;
    if (filters.light !== 'all') {
      const light = supplierLightMap.get(sup.id) ?? 'safe';
      if (light !== filters.light) return false;
    }
    if (filters.noBackupOnly && !sup.isSingleSource && sup.alternativesCount > 0) {
      return false;
    }
    return true;
  };

  const matchedFilterCount = useMemo(
    () => graph.suppliers.filter((s) => matchesFilter(s)).length,
    [graph.suppliers, filters, supplierLightMap],
  );

  // Curved path flowing right -> left toward the business
  const buildCurvedPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const dx = x1 - x2;
    const ctrlOffset = Math.max(40, Math.abs(dx) * 0.48);
    const cx1 = x1 - Math.sign(dx || 1) * ctrlOffset;
    const cx2 = x2 + Math.sign(dx || 1) * ctrlOffset;
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  };

  // Zoom & Pan helpers
  const clampPan = (nx: number, ny: number, z: number) => {
    const maxOffsetX = (CANVAS_W * (z - 1)) / 2 + 120;
    const maxOffsetY = (CANVAS_H * (z - 1)) / 2 + 80;
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, nx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, ny)),
    };
  };

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.max(0.7, Math.min(2.2, Math.round(nextZoom * 100) / 100));
    setZoom(clamped);
    setPan((p) => clampPan(p.x, p.y, clamped));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-supplier-node="true"]')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.origX + dx, dragRef.current.origY + dy, zoom));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  // Compute SVG transform centered on CANVAS_W/2, CANVAS_H/2
  const svgTransform = `translate(${CANVAS_W / 2 + pan.x}, ${CANVAS_H / 2 + pan.y}) scale(${zoom}) translate(${-CANVAS_W / 2}, ${-CANVAS_H / 2})`;

  // Mini-map viewport indicator coordinates in [0..CANVAS_W, 0..CANVAS_H]
  const viewBoxW = CANVAS_W / zoom;
  const viewBoxH = CANVAS_H / zoom;
  const viewBoxX = CANVAS_W / 2 - viewBoxW / 2 - pan.x / zoom;
  const viewBoxY = CANVAS_H / 2 - viewBoxH / 2 - pan.y / zoom;

  const columns: Array<{
    x: number;
    w: number;
    title: string;
    subtitle: string;
    color: string;
    foggy: boolean;
  }> = [
    {
      x: 18,
      w: 174,
      title: t.layers.you,
      subtitle: graph.business.city,
      color: 'var(--teal)',
      foggy: false,
    },
    {
      x: 214,
      w: 230,
      title: t.layers.layer1,
      subtitle: 'Layer 1',
      color: 'var(--blue)',
      foggy: false,
    },
    {
      x: 462,
      w: 230,
      title: t.layers.layer2,
      subtitle: 'Layer 2',
      color: 'var(--amber)',
      foggy: !outerRingsDiscovered,
    },
    {
      x: 710,
      w: 212,
      title: t.layers.layer3,
      subtitle: 'Layer 3',
      color: 'var(--ember)',
      foggy: !outerRingsDiscovered,
    },
  ];

  return (
    <div
      data-spotlight="chain-map-canvas"
      className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-3"
    >
      {/* Legend + View mode + Zoom controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-[var(--risk-safe)]" />
            <span>Size = importance</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-dashed border-[var(--amber)]" />
            <span>Dashed = no backup supplier</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              aria-pressed={viewMode === 'columns'}
              className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                viewMode === 'columns'
                  ? 'bg-[var(--navy)] text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chain columns</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('india')}
              aria-pressed={viewMode === 'india'}
              className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                viewMode === 'india'
                  ? 'bg-[var(--navy)] text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>India map</span>
            </button>
          </div>

          {/* Zoom buttons */}
          <div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0.5">
            <button
              type="button"
              onClick={() => applyZoom(zoom - 0.2)}
              aria-label="Zoom out"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--navy)]"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="px-2 font-mono text-xs text-[var(--muted)] tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => applyZoom(zoom + 0.2)}
              aria-label="Zoom in"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--navy)]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Reset zoom"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--navy)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {hasAnyFilter && matchedFilterCount === 0 && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[var(--amber)]/45 bg-[var(--amber)]/10 px-3.5 py-2.5 text-xs font-semibold text-[var(--text)]"
        >
          {t.ui.noFilterMatches}
        </div>
      )}

      {/* Main interactive SVG viewport with embedded Mini-map */}
      <div className="relative w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--ink)]">
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full h-auto min-h-[340px] max-h-[540px] block select-none cursor-grab active:cursor-grabbing touch-pan-y"
          role="img"
          aria-label={t.sections.chainMapHeading}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            {/* Arrow markers pointing toward the business */}
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--muted)" opacity="0.7" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--amber)" />
            </marker>
            <marker
              id="arrow-danger"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--risk-urgent)" />
            </marker>
          </defs>

          <g transform={svgTransform}>
            {/* Background: Soft labelled column backdrops OR India coastline */}
            {viewMode === 'columns' ? (
              <g>
                {columns.map((col, idx) => (
                  <motion.g
                    key={col.title}
                    initial={false}
                    animate={{
                      opacity: col.foggy ? 0.35 : 1,
                    }}
                    transition={{ duration: 0.65, delay: idx > 1 ? (idx - 1) * 0.12 : 0 }}
                  >
                    <rect
                      x={col.x}
                      y={16}
                      width={col.w}
                      height={CANVAS_H - 32}
                      rx={14}
                      fill="var(--navy)"
                      fillOpacity={col.foggy ? 0.3 : 0.72}
                      stroke={col.color}
                      strokeOpacity={col.foggy ? 0.25 : 0.35}
                      strokeWidth={1.25}
                      strokeDasharray={col.foggy ? '5 4' : undefined}
                    />
                    <text
                      x={col.x + col.w / 2}
                      y={40}
                      textAnchor="middle"
                      fill={col.color}
                      fontSize="12.5"
                      fontWeight="700"
                    >
                      {col.title}
                    </text>
                    <text
                      x={col.x + col.w / 2}
                      y={56}
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontSize="10.5"
                    >
                      {col.foggy ? 'Hidden in fog — tap Show hidden layers' : col.subtitle}
                    </text>
                  </motion.g>
                ))}
              </g>
            ) : (
              <path
                d={indiaGeo.outlinePath}
                fill="var(--panel)"
                fillOpacity="0.45"
                stroke="var(--line)"
                strokeWidth="1.5"
              />
            )}

            {/* Curved SUPPLIES links with arrows toward business */}
            {graph.links.map((link) => {
              const [rawX1, rawY1] = getCoord(link.fromId);
              const [rawX2, rawY2] = getCoord(link.toId);
              const fromSup = graph.suppliers.find((s) => s.id === link.fromId);
              const toSup = graph.suppliers.find((s) => s.id === link.toId);
              const rFrom = fromSup ? 13 + (fromSup.importance ?? 0.6) * 13 : 20;
              const rTo = toSup ? 13 + (toSup.importance ?? 0.6) * 13 : 22;

              // Trim start/end slightly so arrow touches outer ring neatly
              const angle = Math.atan2(rawY2 - rawY1, rawX2 - rawX1);
              const x1 = rawX1 + Math.cos(angle) * (rFrom + 3);
              const y1 = rawY1 + Math.sin(angle) * (rFrom + 3);
              const x2 = rawX2 - Math.cos(angle) * (rTo + 6);
              const y2 = rawY2 - Math.sin(angle) * (rTo + 6);

              const pathD = buildCurvedPath(x1, y1, x2, y2);
              const isFoggy =
                fromSup &&
                fromSup.layer > 1 &&
                !outerRingsDiscovered &&
                !fromSup.verified;
              const isSelectedPath = activePathData.linkIds.has(link.id);
              const fromLight = fromSup ? supplierLightMap.get(fromSup.id) ?? 'safe' : 'safe';
              const isTrouble = fromLight === 'critical' || fromLight === 'warning';

              const strokeColor = isSelectedPath
                ? 'var(--amber)'
                : isTrouble
                  ? 'var(--risk-urgent)'
                  : 'var(--muted)';

              const markerId = isSelectedPath
                ? 'url(#arrow-active)'
                : isTrouble
                  ? 'url(#arrow-danger)'
                  : 'url(#arrow-default)';

              const dimForSelection =
                Boolean(selectedSupplierId) && !isSelectedPath;

              return (
                <g key={link.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelectedPath ? 3 : isTrouble ? 2 : 1.4}
                    strokeOpacity={
                      isFoggy
                        ? 0.18
                        : dimForSelection
                          ? 0.2
                          : isSelectedPath
                            ? 1
                            : 0.58
                    }
                    strokeDasharray={isFoggy ? '4 4' : undefined}
                    markerEnd={markerId}
                  />

                  {/* Travelling pulse along selected path toward business */}
                  {isSelectedPath && !prefersReducedMotion && (
                    <circle r={4.5} fill="var(--amber)">
                      <animateMotion
                        dur="1.15s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Business (Left column) */}
            {(() => {
              const [yx, yy] = getCoord('YOU');
              const isPathYou = activePathData.nodeIds.has('YOU');
              return (
                <g
                  transform={`translate(${yx}, ${yy})`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
                  role="button"
                  tabIndex={0}
                  aria-label={`${graph.business.businessName}, ${t.layers.you}. Clear selected path`}
                  onClick={() => onSelectSupplier(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSupplier(null);
                    }
                  }}
                >
                  <circle
                    r={32}
                    fill="var(--teal)"
                    fillOpacity={isPathYou ? 0.28 : 0.14}
                  />
                  <circle
                    r={22}
                    fill="var(--teal)"
                    stroke="var(--ink)"
                    strokeWidth="3"
                  />
                  <text
                    y={4}
                    textAnchor="middle"
                    fill="var(--amber-ink)"
                    fontSize="11"
                    fontWeight="800"
                  >
                    YOU
                  </text>
                  <text
                    y={42}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {graph.business.businessName.slice(0, 22)}
                  </text>
                </g>
              );
            })()}

            {/* Supplier circles */}
            {graph.suppliers.map((sup) => {
              const [x, y] = getCoord(sup.id);
              const radius = Math.round(13 + (sup.importance ?? 0.6) * 13);
              const light = supplierLightMap.get(sup.id) ?? 'safe';
              const lightColor = LIGHT_COLOR_VAR[light];
              const noBackup = sup.isSingleSource || sup.alternativesCount === 0;

              const isFoggy =
                sup.layer > 1 && !outerRingsDiscovered && !sup.verified;
              const isSelected = selectedSupplierId === sup.id;
              const isOnSelectedPath = activePathData.nodeIds.has(sup.id);
              const isWeakSpot = showWeakSpots && weakSpotIds.has(sup.id);
              const isFilterMatch = matchesFilter(sup);

              const baseOpacity = isFoggy
                ? 0.24
                : hasAnyFilter && !isFilterMatch
                  ? 0.18
                  : selectedSupplierId && !isOnSelectedPath
                    ? 0.45
                    : 1;

              return (
                <motion.g
                  key={sup.id}
                  data-supplier-node="true"
                  initial={false}
                  animate={{
                    x,
                    y,
                    opacity: baseOpacity,
                    scale: isFoggy ? 0.88 : isSelected || isWeakSpot ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="cursor-pointer"
                  onClick={() => onSelectSupplier(sup)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${sup.name}, ${sup.city}, ${sup.stockDays} stock days${
                    noBackup ? ', no backup supplier' : ''
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSupplier(sup);
                    }
                  }}
                >
                  {/* Weak-spot pulsing warning halo */}
                  {isWeakSpot &&
                    (prefersReducedMotion ? (
                      <circle
                        r={radius + 11}
                        fill="none"
                        stroke="var(--risk-urgent)"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <motion.circle
                        r={radius + 11}
                        fill="none"
                        stroke="var(--risk-urgent)"
                        strokeWidth={2.5}
                        initial={{ scale: 0.9, opacity: 0.9 }}
                        animate={{ scale: 1.25, opacity: 0.15 }}
                        transition={{ duration: 0.85, repeat: Infinity }}
                      />
                    ))}

                  {/* Selected path glow */}
                  {isOnSelectedPath && (
                    <circle
                      r={radius + 8}
                      fill="var(--amber)"
                      fillOpacity="0.18"
                    />
                  )}

                  {/* Dashed outer ring marks "no backup supplier" */}
                  {noBackup && (
                    <circle
                      r={radius + 5}
                      fill="none"
                      stroke={isWeakSpot ? 'var(--risk-urgent)' : 'var(--amber)'}
                      strokeWidth="1.6"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Main supplier circle: size = importance, ring colour = traffic light */}
                  <circle
                    r={radius}
                    fill="var(--panel)"
                    stroke={isSelected ? 'var(--amber)' : lightColor}
                    strokeWidth={isSelected ? 4 : 3}
                  />

                  {/* Stock days inside node */}
                  <text
                    y={4}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {sup.stockDays}d
                  </text>

                  {/* Short supplier name + city label */}
                  <text
                    y={radius + 16}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    {sup.name.split(' ').slice(0, 2).join(' ')}
                  </text>
                  <text
                    y={radius + 28}
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="9.5"
                  >
                    {sup.city}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>

        {/* Mini-map (bottom-right corner) */}
        <div
          aria-label="Mini-map overview"
          className="absolute bottom-2.5 right-2.5 w-[148px] h-[84px] rounded-lg border border-[var(--line)] bg-[var(--navy)]/90 backdrop-blur-sm p-1 shadow-lg pointer-events-none hidden sm:block"
        >
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="w-full h-full">
            {viewMode === 'columns' &&
              columns.map((col) => (
                <rect
                  key={col.title}
                  x={col.x}
                  y={16}
                  width={col.w}
                  height={CANVAS_H - 32}
                  rx={12}
                  fill="var(--panel)"
                  fillOpacity={col.foggy ? 0.25 : 0.6}
                />
              ))}

            {(() => {
              const [yx, yy] = getCoord('YOU');
              return <circle cx={yx} cy={yy} r={14} fill="var(--teal)" />;
            })()}

            {graph.suppliers.map((sup) => {
              const [sx, sy] = getCoord(sup.id);
              const light = supplierLightMap.get(sup.id) ?? 'safe';
              return (
                <circle
                  key={sup.id}
                  cx={sx}
                  cy={sy}
                  r={10}
                  fill={LIGHT_COLOR_VAR[light]}
                />
              );
            })}

            {/* Current viewport frame */}
            <rect
              x={viewBoxX}
              y={viewBoxY}
              width={viewBoxW}
              height={viewBoxH}
              fill="none"
              stroke="var(--amber)"
              strokeWidth={10}
              rx={10}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
