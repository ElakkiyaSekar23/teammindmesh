import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { INDIA_GAZETTEER, SOUTH_WEST_INDIA_OUTLINE } from '../data/gazetteer';
import type { SupplyChainGraph } from '../engine';

interface ShockTestMapProps {
  graph: SupplyChainGraph;
  selectedCityOrId: string;
  selectionMode: 'city' | 'supplier' | 'group';
  selectedGroup?: string;
  onSelectCity: (city: string) => void;
  onSelectSupplierId: (supplierId: string) => void;
  onSelectGroup?: (group: string) => void;
}

export function ShockTestMap({
  graph,
  selectedCityOrId,
  selectionMode,
  selectedGroup,
  onSelectCity,
  onSelectSupplierId,
  onSelectGroup,
}: ShockTestMapProps) {
  const width = 380;
  const height = 300;

  const { projection, outlinePath, cityPins } = useMemo(() => {
    const proj = d3
      .geoMercator()
      .center([78.4, 17.5])
      .scale(740)
      .translate([width / 2, height / 2]);

    const lineGen = d3.line<[number, number]>().curve(d3.curveCatmullRomClosed);
    const pts: Array<[number, number]> = SOUTH_WEST_INDIA_OUTLINE.map(([lat, lng]) => {
      const p = proj([lng, lat]);
      return p ? [p[0], p[1]] : [width / 2, height / 2];
    });

    const uniqueCities = new Map<
      string,
      {
        city: string;
        lat: number;
        lng: number;
        supplierId: string;
        group: string;
        layer: number;
        isSupplierCity: boolean;
      }
    >();

    for (const s of graph.suppliers) {
      if (!uniqueCities.has(s.city)) {
        uniqueCities.set(s.city, {
          city: s.city,
          lat: s.lat,
          lng: s.lng,
          supplierId: s.id,
          group: s.group,
          layer: s.layer,
          isSupplierCity: true,
        });
      }
    }

    if (selectionMode === 'city') {
      for (const hub of INDIA_GAZETTEER) {
        if (!uniqueCities.has(hub.name) && uniqueCities.size < 16) {
          uniqueCities.set(hub.name, {
            city: hub.name,
            lat: hub.lat,
            lng: hub.lng,
            supplierId: '',
            group: '',
            layer: 3,
            isSupplierCity: false,
          });
        }
      }
    }

    const pins = Array.from(uniqueCities.values()).map((c) => {
      const p = proj([c.lng, c.lat]) ?? [width / 2, height / 2];
      return { ...c, x: p[0], y: p[1] };
    });

    return {
      projection: proj,
      outlinePath: lineGen(pts) ?? '',
      cityPins: pins,
    };
  }, [graph.suppliers, selectionMode]);

  const youPos = projection([graph.business.lng, graph.business.lat]) ?? [width / 2, height / 2];

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--ink)]/60 p-2.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[240px]"
        role="img"
        aria-label="Supplier hub map for choosing shock location"
      >
        <path
          d={outlinePath}
          fill="color-mix(in srgb, var(--blue) 9%, transparent)"
          stroke="var(--line)"
          strokeWidth={1.2}
        />

        {/* Business center */}
        <g transform={`translate(${youPos[0]}, ${youPos[1]})`}>
          <circle r={6} fill="var(--teal)" />
          <text
            y={-10}
            textAnchor="middle"
            fill="var(--teal)"
            fontSize={10}
            fontWeight={700}
          >
            YOU ({graph.business.city})
          </text>
        </g>

        {/* City pins */}
        {cityPins.map((pin) => {
          const isSelected =
            selectionMode === 'city'
              ? pin.city.toLowerCase() === selectedCityOrId.toLowerCase()
              : selectionMode === 'supplier'
                ? graph.suppliers.some(
                    (s) => s.id === selectedCityOrId && s.city === pin.city,
                  )
                : Boolean(
                    selectedGroup &&
                      graph.suppliers.some(
                        (s) => s.group === selectedGroup && s.city === pin.city,
                      ),
                  );

          const isLeftAlignedLabel = pin.lng < 76.5;
          const activatePin = () => {
            if (selectionMode === 'supplier') {
              if (pin.supplierId) onSelectSupplierId(pin.supplierId);
            } else if (selectionMode === 'group') {
              if (pin.group && onSelectGroup) onSelectGroup(pin.group);
            } else {
              onSelectCity(pin.city);
            }
          };

          return (
            <g
              key={pin.city}
              transform={`translate(${pin.x}, ${pin.y})`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Select ${pin.city}${pin.group ? ` (${pin.group})` : ''}`}
              aria-pressed={isSelected}
              onClick={activatePin}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  activatePin();
                }
              }}
            >
              <circle r={16} fill="transparent" />
              {isSelected && (
                <circle
                  r={12}
                  fill="color-mix(in srgb, var(--amber) 22%, transparent)"
                  stroke="var(--amber)"
                  strokeWidth={1.5}
                />
              )}
              <circle
                r={isSelected ? 6 : pin.isSupplierCity ? 4.5 : 3.5}
                fill={
                  isSelected
                    ? 'var(--amber)'
                    : pin.isSupplierCity
                      ? 'var(--blue)'
                      : 'var(--muted)'
                }
                stroke="var(--ink)"
                strokeWidth={1}
              />
              <text
                x={isLeftAlignedLabel ? -8 : 8}
                y={3}
                textAnchor={isLeftAlignedLabel ? 'end' : 'start'}
                fill={isSelected ? 'var(--amber)' : pin.isSupplierCity ? 'var(--text)' : 'var(--muted)'}
                fontSize={isSelected ? 10.5 : 9.5}
                fontWeight={isSelected ? 700 : 500}
              >
                {pin.city}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
