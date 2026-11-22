import React, { useEffect, useId, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Compass, MapPin, Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { getPlaceByCity, INDIA_OUTLINE_GEOJSON } from '../data/gazetteer';
import {
  assess,
  getRiskTypeMeta,
  type SupplierLayer,
  type SupplierNode,
  type SupplyChainGraph,
  type TroubleEvent,
} from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

interface IndiaSupplyMapProps {
  graph: SupplyChainGraph;
  events: TroubleEvent[];
  selectedEventId: string | null;
  onSelectEventId?: (eventId: string) => void;
  onSelectSupplier?: (supplier: SupplierNode) => void;
  outerRingsDiscovered?: boolean;
}

interface CityCluster {
  city: string;
  state: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  hasBusiness: boolean;
  suppliers: SupplierNode[];
  primaryLayer: SupplierLayer | 0;
}

interface RouteArc {
  id: string;
  fromCity: string;
  toCity: string;
  pathD: string;
  fromLayer: SupplierLayer;
  sharePct: number;
  isActiveChainArc: boolean;
}

const LAYER_COLORS: Record<SupplierLayer | 0, string> = {
  0: 'var(--teal)',
  1: 'var(--blue)',
  2: 'var(--amber)',
  3: 'var(--ember)',
};

const LAYER_NAMES: Record<SupplierLayer | 0, string> = {
  0: 'You',
  1: 'Your suppliers',
  2: 'Their suppliers',
  3: "Suppliers' suppliers",
};

function buildCurvedArc(x1: number, y1: number, x2: number, y2: number, index: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  // Local loop if both points sit in the same city
  if (dist < 6) {
    return `M ${x1} ${y1} C ${x1 - 24} ${y1 - 26}, ${x1 + 26} ${y1 - 24}, ${x2} ${y2}`;
  }

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bend = Math.min(46, Math.max(18, dist * 0.22)) * (index % 2 === 0 ? 1 : -1);
  return `M ${x1} ${y1} Q ${mx + nx * bend} ${my + ny * bend} ${x2} ${y2}`;
}

export function IndiaSupplyMap({
  graph,
  events,
  selectedEventId,
  onSelectEventId,
  onSelectSupplier,
  outerRingsDiscovered = true,
}: IndiaSupplyMapProps) {
  const { t } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();
  const markerId = useId().replace(/:/g, '');
  const width = 640;
  const height = 540;

  const [localEventId, setLocalEventId] = useState<string | null>(
    selectedEventId ?? events[0]?.id ?? null,
  );
  const [simDay, setSimDay] = useState<number>(6);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [focusedCity, setFocusedCity] = useState<string>(graph.business.city);

  useEffect(() => {
    if (selectedEventId && events.some((e) => e.id === selectedEventId)) {
      setLocalEventId(selectedEventId);
    } else if (events.length > 0 && !events.some((e) => e.id === localEventId)) {
      setLocalEventId(events[0].id);
    } else if (events.length === 0) {
      setLocalEventId(null);
    }
  }, [events, localEventId, selectedEventId]);

  const activeEvent = useMemo(
    () => events.find((e) => e.id === localEventId) ?? null,
    [events, localEventId],
  );

  // Projection + India GeoJSON outline + Graticule via d3-geo
  const { projection, outlinePath, graticulePath, geoPathGen } = useMemo(() => {
    const proj = d3
      .geoMercator()
      .fitExtent(
        [
          [34, 24],
          [width - 34, height - 24],
        ],
        INDIA_OUTLINE_GEOJSON,
      );

    const pathGen = d3.geoPath(proj);
    const outline = pathGen(INDIA_OUTLINE_GEOJSON) ?? '';
    const graticule = pathGen(d3.geoGraticule().step([4, 4])()) ?? '';

    return {
      projection: proj,
      outlinePath: outline,
      graticulePath: graticule,
      geoPathGen: pathGen,
    };
  }, []);

  // Active event assessment + per-supplier exhaustion schedule (Day 0..30)
  const {
    affectedOutputs,
    affectedSupplierIds,
    activeArcPairs,
    drainDayBySupplier,
    hitBusinessDay,
    reachCircles,
    eventMeta,
  } = useMemo(() => {
    if (!activeEvent) {
      return {
        affectedOutputs: [],
        affectedSupplierIds: new Set<string>(),
        activeArcPairs: new Set<string>(),
        drainDayBySupplier: new Map<string, { startDay: number; runOutDay: number }>(),
        hitBusinessDay: null as number | null,
        reachCircles: [] as Array<{ key: string; coreD: string; edgeD: string; label: string }>,
        eventMeta: null,
      };
    }

    const outputs = assess(graph, activeEvent);
    const meta = getRiskTypeMeta(activeEvent);
    const affectedIds = new Set<string>();
    const arcPairs = new Set<string>();
    const scheduleMap = new Map<string, { startDay: number; runOutDay: number }>();
    let earliestHit: number | null = null;

    for (const out of outputs) {
      affectedIds.add(out.supplierId);

      // Walk affected supplier -> ... -> Layer 1 -> YOU sequentially matching Formula 3
      let cursor = 0;
      for (let i = 0; i < out.chain.length; i++) {
        const node = out.chain[i];
        const startDay = cursor;
        const runOutDay = cursor + node.stockDays;
        const prev = scheduleMap.get(node.id);
        if (!prev || runOutDay < prev.runOutDay) {
          scheduleMap.set(node.id, { startDay, runOutDay });
        }
        cursor = runOutDay + 2;

        const nextTargetId = i < out.chain.length - 1 ? out.chain[i + 1].id : 'YOU';
        arcPairs.add(`${node.id}->${nextTargetId}`);
      }

      if (earliestHit === null || out.daysUntilHurt < earliestHit) {
        earliestHit = out.daysUntilHurt;
      }
    }

    // Build translucent d3.geoCircle paths using exact engine reachKm values
    const circles: Array<{ key: string; coreD: string; edgeD: string; label: string }> = [];
    if (meta.reachKm > 0) {
      const targetPlace = getPlaceByCity(activeEvent.target);
      const centerLng = targetPlace?.lng ?? activeEvent.lng;
      const centerLat = targetPlace?.lat ?? activeEvent.lat;
      if (centerLng && centerLat) {
        const coreDeg = meta.reachKm / 111.32;
        const edgeDeg = (meta.reachKm * 1.897) / 111.32; // closeness >= 0.15 edge
        const coreGeo = d3.geoCircle().center([centerLng, centerLat]).radius(coreDeg)();
        const edgeGeo = d3.geoCircle().center([centerLng, centerLat]).radius(edgeDeg)();
        circles.push({
          key: `event-reach-${activeEvent.id}`,
          coreD: geoPathGen(coreGeo) ?? '',
          edgeD: geoPathGen(edgeGeo) ?? '',
          label: `${meta.reachKm} km engine reach`,
        });
      }
    } else {
      // Material or single-supplier risk: show pulsing geo zone around affected supplier cities
      const seenCities = new Set<string>();
      for (const out of outputs) {
        const sup = out.chain[0];
        if (!sup || seenCities.has(sup.city)) continue;
        seenCities.add(sup.city);
        const zoneGeo = d3.geoCircle().center([sup.lng, sup.lat]).radius(75 / 111.32)();
        circles.push({
          key: `zone-${sup.id}`,
          coreD: geoPathGen(zoneGeo) ?? '',
          edgeD: '',
          label: 'Direct hit',
        });
      }
    }

    return {
      affectedOutputs: outputs,
      affectedSupplierIds: affectedIds,
      activeArcPairs: arcPairs,
      drainDayBySupplier: scheduleMap,
      hitBusinessDay: earliestHit,
      reachCircles: circles,
      eventMeta: meta,
    };
  }, [activeEvent, geoPathGen, graph]);

  // Snap time slider cleanly near hit day when switching events
  useEffect(() => {
    if (hitBusinessDay !== null) {
      setSimDay(Math.min(30, Math.max(1, hitBusinessDay)));
    } else {
      setSimDay(0);
    }
    setIsPlaying(false);
  }, [activeEvent?.id, hitBusinessDay]);

  // Play/pause scrubber 0 -> 30 days
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setSimDay((prev) => {
        if (prev >= 30) {
          setIsPlaying(false);
          return 30;
        }
        return prev + 1;
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  // City clusters & supply route arcs
  const { cityClusters, routeArcs, youPoint } = useMemo(() => {
    const map = new Map<string, CityCluster>();
    const bizPos = projection([graph.business.lng, graph.business.lat]) ?? [
      width / 2,
      height / 2,
    ];

    map.set(graph.business.city.toLowerCase(), {
      city: graph.business.city,
      state: graph.business.state,
      lat: graph.business.lat,
      lng: graph.business.lng,
      x: bizPos[0],
      y: bizPos[1],
      hasBusiness: true,
      suppliers: [],
      primaryLayer: 0,
    });

    for (const sup of graph.suppliers) {
      const key = sup.city.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.suppliers.push(sup);
        if (
          existing.primaryLayer === 0 ||
          sup.layer < existing.primaryLayer
        ) {
          existing.primaryLayer = sup.layer;
        }
      } else {
        const pos = projection([sup.lng, sup.lat]) ?? [width / 2, height / 2];
        map.set(key, {
          city: sup.city,
          state: sup.state,
          lat: sup.lat,
          lng: sup.lng,
          x: pos[0],
          y: pos[1],
          hasBusiness: false,
          suppliers: [sup],
          primaryLayer: sup.layer,
        });
      }
    }

    const supById = new Map(graph.suppliers.map((s) => [s.id, s]));
    const arcs: RouteArc[] = graph.links
      .map((link, idx) => {
        const fromSup = supById.get(link.fromId);
        if (!fromSup) return null;
        const fromPos = projection([fromSup.lng, fromSup.lat]);
        if (!fromPos) return null;

        let toPos: [number, number] | null = null;
        let toCity = graph.business.city;
        if (link.toId === 'YOU') {
          toPos = [bizPos[0], bizPos[1]];
        } else {
          const toSup = supById.get(link.toId);
          if (!toSup) return null;
          toCity = toSup.city;
          toPos = projection([toSup.lng, toSup.lat]);
        }
        if (!toPos) return null;

        return {
          id: link.id,
          fromCity: fromSup.city,
          toCity,
          pathD: buildCurvedArc(fromPos[0], fromPos[1], toPos[0], toPos[1], idx),
          fromLayer: fromSup.layer,
          sharePct: link.sharePct,
          isActiveChainArc: activeArcPairs.has(`${link.fromId}->${link.toId}`),
        };
      })
      .filter((x): x is RouteArc => Boolean(x));

    return {
      cityClusters: Array.from(map.values()),
      routeArcs: arcs,
      youPoint: bizPos,
    };
  }, [activeArcPairs, graph.business, graph.links, graph.suppliers, projection]);

  // Which suppliers have run out by current simDay
  const runOutList = useMemo(() => {
    const items: Array<{ supplier: SupplierNode; runOutDay: number }> = [];
    for (const sup of graph.suppliers) {
      const sched = drainDayBySupplier.get(sup.id);
      if (sched && simDay >= sched.runOutDay) {
        items.push({ supplier: sup, runOutDay: sched.runOutDay });
      }
    }
    return items.sort((a, b) => a.runOutDay - b.runOutDay);
  }, [drainDayBySupplier, graph.suppliers, simDay]);

  const isBusinessHitAtSimDay =
    activeEvent !== null &&
    hitBusinessDay !== null &&
    simDay >= hitBusinessDay &&
    activeEvent.durationDays >= hitBusinessDay;

  const focusedCluster =
    cityClusters.find((c) => c.city.toLowerCase() === focusedCity.toLowerCase()) ??
    cityClusters[0];

  const handleSelectEvent = (evId: string) => {
    setLocalEventId(evId);
    onSelectEventId?.(evId);
  };

  return (
    <section
      id="india-geo-map"
      aria-label="India supply chain map"
      className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-4"
    >
      {/* Header & Active Event Selector */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
              India Hub Map &amp; Reach
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
            Every city in {graph.business.businessName}&apos;s supply routes, coloured by layer
            with trouble reach and 0–30 day stock drain.
          </p>
        </div>

        {/* Event pills */}
        {events.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
            {t.sections.noTroublesYet}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {events.map((ev) => {
              const active = activeEvent?.id === ev.id;
              const meta = getRiskTypeMeta(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => handleSelectEvent(ev.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                      : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Radio className="h-3 w-3 text-[var(--ember)]" aria-hidden="true" />
                  <span>{ev.target}</span>
                  {meta.reachKm > 0 && (
                    <span className="font-mono text-[10px] text-[var(--amber)]">
                      {meta.reachKm}km
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: d3-geo SVG Map + Live Status & Time Slider */}
      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* India d3-geo SVG Map */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--ink)]/75 p-3 relative overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[470px]"
            role="img"
            aria-label="Map of India showing supply route arcs, supplier hub cities by layer, and active event reach radius"
          >
            <defs>
              <marker
                id={`arc-arrow-${markerId}`}
                viewBox="0 0 8 8"
                refX="6"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--muted)" fillOpacity="0.65" />
              </marker>
              <marker
                id={`arc-arrow-hot-${markerId}`}
                viewBox="0 0 8 8"
                refX="6"
                refY="4"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--amber)" />
              </marker>
              <radialGradient id={`reach-grad-${markerId}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.34" />
                <stop offset="70%" stopColor="var(--amber)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.02" />
              </radialGradient>
            </defs>

            {/* Graticule grid */}
            <path
              d={graticulePath}
              fill="none"
              stroke="var(--line)"
              strokeWidth={0.8}
              strokeDasharray="2 3"
            />

            {/* Simplified embedded India outline */}
            {outlinePath && (
              <path
                d={outlinePath}
                fill="var(--blue)"
                fillOpacity="0.09"
                stroke="var(--muted)"
                strokeOpacity="0.42"
                strokeWidth={1.3}
                strokeLinejoin="round"
              />
            )}

            {/* Subtle lat/lng margin annotations */}
            <text x={14} y={24} fill="var(--muted)" fillOpacity="0.7" fontSize={9.5}>
              68°E–97°E · d3-geo
            </text>

            {/* Translucent expanding event reach circle using exact engine reachKm */}
            {reachCircles.map((rc) => (
              <g key={rc.key} className="pointer-events-none">
                {rc.edgeD && (
                  <path
                    d={rc.edgeD}
                    fill="var(--ember)"
                    fillOpacity="0.06"
                    stroke="var(--ember)"
                    strokeOpacity="0.38"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                )}
                {rc.coreD &&
                  (prefersReducedMotion ? (
                    <path
                      d={rc.coreD}
                      fill={`url(#reach-grad-${markerId})`}
                      stroke="var(--ember)"
                      strokeOpacity={0.72}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <motion.path
                      d={rc.coreD}
                      fill={`url(#reach-grad-${markerId})`}
                      stroke="var(--ember)"
                      strokeOpacity={0.68}
                      strokeWidth={1.5}
                      initial={{ opacity: 0.45 }}
                      animate={{ opacity: [0.45, 0.85, 0.45] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
              </g>
            ))}

            {/* Supply route arcs */}
            {routeArcs.map((arc) => {
              const strokeColor = arc.isActiveChainArc
                ? 'var(--amber)'
                : LAYER_COLORS[arc.fromLayer];
              return (
                <path
                  key={arc.id}
                  d={arc.pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeOpacity={arc.isActiveChainArc ? 0.92 : outerRingsDiscovered ? 0.42 : 0.25}
                  strokeWidth={arc.isActiveChainArc ? 2.2 : 1.2}
                  strokeDasharray={arc.isActiveChainArc ? '5 3' : undefined}
                  markerEnd={
                    arc.isActiveChainArc
                      ? `url(#arc-arrow-hot-${markerId})`
                      : `url(#arc-arrow-${markerId})`
                  }
                />
              );
            })}

            {/* City markers */}
            {cityClusters.map((cluster) => {
              const cityHasAffected = cluster.suppliers.some((s) =>
                affectedSupplierIds.has(s.id),
              );
              const cityHasRunOut = cluster.suppliers.some((s) => {
                const sched = drainDayBySupplier.get(s.id);
                return sched ? simDay >= sched.runOutDay : false;
              });
              const cityDraining =
                !cityHasRunOut &&
                cluster.suppliers.some((s) => {
                  const sched = drainDayBySupplier.get(s.id);
                  return sched ? simDay >= sched.startDay && simDay < sched.runOutDay : false;
                });

              const isFocused =
                focusedCity.toLowerCase() === cluster.city.toLowerCase();

              const dotColor = cityHasRunOut
                ? 'var(--risk-urgent)'
                : cityDraining
                  ? 'var(--risk-watch)'
                  : cluster.hasBusiness && cluster.suppliers.length === 0
                    ? 'var(--teal)'
                    : LAYER_COLORS[
                        cluster.suppliers[0]?.layer ?? cluster.primaryLayer
                      ];

              const alignLeft = cluster.lng < 76.2 || cluster.city === 'Mangalore';

              return (
                <g
                  key={cluster.city}
                  transform={`translate(${cluster.x}, ${cluster.y})`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
                  role="button"
                  tabIndex={0}
                  aria-label={`${cluster.city}, ${cluster.state}${
                    cluster.suppliers.length > 0
                      ? `, ${cluster.suppliers.length} supplier${cluster.suppliers.length > 1 ? 's' : ''}`
                      : ', your business hub'
                  }`}
                  onClick={() => {
                    setFocusedCity(cluster.city);
                    if (cluster.suppliers[0] && onSelectSupplier) {
                      onSelectSupplier(cluster.suppliers[0]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFocusedCity(cluster.city);
                      if (cluster.suppliers[0] && onSelectSupplier) {
                        onSelectSupplier(cluster.suppliers[0]);
                      }
                    }
                  }}
                >
                  {/* Pulsing rings for affected supplier cities */}
                  {(cityHasAffected || (cluster.hasBusiness && isBusinessHitAtSimDay)) &&
                    (prefersReducedMotion ? (
                      <circle
                        r={15}
                        fill="none"
                        stroke={
                          cityHasRunOut || (cluster.hasBusiness && isBusinessHitAtSimDay)
                            ? 'var(--risk-urgent)'
                            : 'var(--amber)'
                        }
                        strokeWidth={1.6}
                      />
                    ) : (
                      <>
                        <motion.circle
                          r={12}
                          fill="none"
                          stroke={
                            cityHasRunOut || (cluster.hasBusiness && isBusinessHitAtSimDay)
                              ? 'var(--risk-urgent)'
                              : 'var(--amber)'
                          }
                          strokeWidth={1.6}
                          initial={{ r: 8, opacity: 0.9 }}
                          animate={{ r: 22, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.circle
                          r={10}
                          fill="none"
                          stroke="var(--amber)"
                          strokeWidth={1.2}
                          initial={{ r: 7, opacity: 0.85 }}
                          animate={{ r: 17, opacity: 0 }}
                          transition={{
                            duration: 1.5,
                            delay: 0.5,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                        />
                      </>
                    ))}

                  {isFocused && (
                    <circle
                      r={11}
                      fill="none"
                      stroke="var(--text)"
                      strokeOpacity={0.7}
                      strokeWidth={1.2}
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Supplier city dot */}
                  <circle
                    r={cluster.hasBusiness ? 7.5 : 5.5}
                    fill={dotColor}
                    stroke="var(--ink)"
                    strokeWidth={1.5}
                  />

                  {/* Business hub inner ring if sharing city with suppliers */}
                  {cluster.hasBusiness && (
                    <circle
                      r={10.5}
                      fill="none"
                      stroke={isBusinessHitAtSimDay ? 'var(--risk-urgent)' : 'var(--teal)'}
                      strokeWidth={1.8}
                    />
                  )}

                  {cluster.suppliers.length > 1 && (
                    <text
                      y={-10}
                      textAnchor="middle"
                      fill="var(--text)"
                      fontSize={9}
                      fontWeight={700}
                    >
                      ×{cluster.suppliers.length}
                    </text>
                  )}

                  <text
                    x={alignLeft ? -11 : 11}
                    y={3.5}
                    textAnchor={alignLeft ? 'end' : 'start'}
                    fill={
                      cityHasRunOut
                        ? 'var(--risk-urgent)'
                        : cluster.hasBusiness
                          ? 'var(--teal)'
                          : 'var(--text)'
                    }
                    fontSize={cluster.hasBusiness || isFocused ? 11 : 10}
                    fontWeight={cluster.hasBusiness || isFocused ? 700 : 600}
                    style={{ paintOrder: 'stroke', stroke: 'var(--ink)', strokeWidth: 3 }}
                  >
                    {cluster.hasBusiness ? `YOU · ${cluster.city}` : cluster.city}
                  </text>
                </g>
              );
            })}

            {/* Business Hit Overlay Badge right by YOU dot */}
            {isBusinessHitAtSimDay && (
              <g transform={`translate(${youPoint[0]}, ${youPoint[1] + 22})`}>
                <rect
                  x={-68}
                  y={-10}
                  width={136}
                  height={20}
                  rx={6}
                  fill="var(--risk-urgent)"
                />
                <text
                  y={3.5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={10}
                  fontWeight={700}
                >
                  HIT ON DAY {hitBusinessDay}
                </text>
              </g>
            )}
          </svg>

          {/* Compact Layer Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--muted)]">
            {([0, 1, 2, 3] as const).map((layerKey) => (
              <span key={layerKey} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[layerKey] }}
                />
                <span>{LAYER_NAMES[layerKey]}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--risk-urgent)]" />
              <span>Ran out</span>
            </span>
          </div>
        </div>

        {/* Right Column: 0–30 Day Time Slider + Out-of-Stock Readout + City Detail */}
        <div className="lg:col-span-5 space-y-4">
          {/* 0–30 Day Time Slider Card */}
          <div className="instrument-panel-raised p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text)]">
                  Time slider (0–30 days)
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {activeEvent
                    ? `${activeEvent.title} (${eventMeta && eventMeta.reachKm > 0 ? `${eventMeta.reachKm} km reach` : 'direct target'})`
                    : 'Select an active event above to trace stock drain'}
                </p>
              </div>
              <span className="font-mono text-xl font-bold text-[var(--amber)] tabular-nums">
                Day {simDay}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={simDay}
              onChange={(e) => {
                setIsPlaying(false);
                setSimDay(Number(e.target.value));
              }}
              aria-label="Simulation timeline day slider from 0 to 30 days"
              className="deeptier-range"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (simDay >= 30) setSimDay(0);
                    setIsPlaying((p) => !p);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[var(--amber)] px-3.5 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Play</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setSimDay(0);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--navy)] px-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Day 0</span>
                </button>
              </div>

              {hitBusinessDay !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setSimDay(Math.min(30, hitBusinessDay));
                  }}
                  className="min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--navy)] px-3 font-mono text-xs font-semibold text-[var(--risk-urgent)] hover:border-[var(--risk-urgent)]"
                >
                  Jump to Day {hitBusinessDay}
                </button>
              )}
            </div>

            {/* Hit Day Callout */}
            {activeEvent && (
              <div
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                  isBusinessHitAtSimDay
                    ? 'border-[var(--risk-urgent)]/50 bg-[var(--risk-urgent)]/15 text-[var(--risk-urgent)]'
                    : hitBusinessDay !== null
                      ? 'border-[var(--line)] bg-[var(--navy)] text-[var(--text)]'
                      : 'border-[var(--teal)]/40 bg-[var(--teal)]/10 text-[var(--teal)]'
                }`}
              >
                {hitBusinessDay === null ? (
                  <span>No supplier in this chain falls within the event reach.</span>
                ) : activeEvent.durationDays < hitBusinessDay ? (
                  <span>
                    Chain cushion is {hitBusinessDay} days (event ends Day {activeEvent.durationDays} before reaching {graph.business.businessName}).
                  </span>
                ) : isBusinessHitAtSimDay ? (
                  <span>
                    {graph.business.businessName} is hit on Day {hitBusinessDay} (now at Day {simDay}).
                  </span>
                ) : (
                  <span>
                    Business hit day: Day {hitBusinessDay} ·{' '}
                    <span className="font-mono text-[var(--amber)]">
                      {hitBusinessDay - simDay} days left before impact
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Suppliers Run Out by Day X */}
          <div className="instrument-panel-raised p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>Suppliers run out by Day {simDay}</span>
              <span className="font-mono tabular-nums text-[var(--text)]">
                {runOutList.length} / {affectedOutputs.length > 0 ? drainDayBySupplier.size : 0}
              </span>
            </div>

            {runOutList.length === 0 ? (
              <p className="text-xs text-[var(--teal)]">
                No supplier has run out of stock by Day {simDay}.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                {runOutList.map(({ supplier, runOutDay }) => (
                  <li
                    key={supplier.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--risk-urgent)]/35 bg-[var(--risk-urgent)]/10 px-3 py-1.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[var(--text)]">
                        {supplier.name}
                      </span>
                      <span className="text-[var(--muted)]"> · {supplier.city}</span>
                    </div>
                    <span className="font-mono font-bold text-[var(--risk-urgent)] shrink-0">
                      Out Day {runOutDay}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Focused City Details */}
          {focusedCluster && (
            <div className="instrument-panel-raised p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text)]">
                  <MapPin className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
                  <span>
                    {focusedCluster.city}, {focusedCluster.state}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {focusedCluster.lat.toFixed(1)}°N, {focusedCluster.lng.toFixed(1)}°E
                </span>
              </div>

              {focusedCluster.hasBusiness && (
                <div className="text-xs font-semibold text-[var(--teal)]">
                  Your business hub: {graph.business.businessName} (
                  {graph.business.ownStockDays} stock days)
                </div>
              )}

              {focusedCluster.suppliers.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {focusedCluster.suppliers.map((sup) => {
                    const sched = drainDayBySupplier.get(sup.id);
                    const isOut = sched ? simDay >= sched.runOutDay : false;
                    return (
                      <li
                        key={sup.id}
                        className="flex items-center justify-between text-xs text-[var(--text)]"
                      >
                        <span>
                          <strong
                            className="mr-1.5 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: LAYER_COLORS[sup.layer] }}
                          />
                          {sup.name} ({sup.itemSupplied})
                        </span>
                        <span
                          className="font-mono font-semibold shrink-0"
                          style={{
                            color: isOut ? 'var(--risk-urgent)' : 'var(--muted)',
                          }}
                        >
                          {sched ? `Out Day ${sched.runOutDay}` : `${sup.stockDays}d stock`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
