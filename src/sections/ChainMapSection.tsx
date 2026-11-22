import React, { Suspense, lazy, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Eye, Filter, MapPin, Plus, Sparkles } from 'lucide-react';
import {
  cypherQueries,
  findSupplyChain,
  type AlertLevel,
  type SupplierLayer,
  type SupplierNode,
} from '../engine';
import { useDeepTier } from '../state/store';
import type { ChainMapFilters, WeakSpotItem } from '../components/ChainMapCanvas';
import { MapErrorBoundary, MapLoadingFallback } from '../components/MapErrorBoundary';
import { SupplierSideSheet } from '../components/SupplierSideSheet';

const ChainMapCanvas = lazy(() =>
  import('../components/ChainMapCanvas').then((m) => ({ default: m.ChainMapCanvas })),
);
const IndiaSupplyMap = lazy(() =>
  import('../components/IndiaSupplyMap').then((m) => ({ default: m.IndiaSupplyMap })),
);

export function ChainMapSection() {
  const {
    graph,
    events,
    selectedEventId,
    setSelectedEventId,
    isCustomShopActive,
    outerRingsDiscovered,
    sharpenOuterRings,
    discoveredSuggestions,
    applyDiscoveredSuggestion,
    addSupplier,
    openWorldPicker,
    recordAudit,
    riskSummary,
    t,
  } = useDeepTier();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWeakSpots, setShowWeakSpots] = useState(false);

  const [filters, setFilters] = useState<ChainMapFilters>({
    layer: 'all',
    light: 'all',
    noBackupOnly: false,
  });

  // Add supplier form state
  const [name, setName] = useState('');
  const [itemSupplied, setItemSupplied] = useState('');
  const [city, setCity] = useState(graph.business.city);
  const [toId, setToId] = useState<string>('YOU');
  const [stockDays, setStockDays] = useState(4);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedSupplier =
    graph.suppliers.find((s) => s.id === selectedSupplierId) ?? null;

  // Map highest traffic light per supplier from live engine summary
  const supplierLightMap = useMemo(() => {
    const map = new Map<string, AlertLevel>();
    const rank: Record<AlertLevel, number> = { safe: 0, watch: 1, warning: 2, critical: 3 };
    graph.suppliers.forEach((s) => map.set(s.id, 'safe'));
    for (const imp of riskSummary.impacts) {
      for (const step of imp.path) {
        if (step.supplierId === 'YOU') continue;
        const cur = map.get(step.supplierId) ?? 'safe';
        if (rank[imp.alertLevel] > rank[cur]) {
          map.set(step.supplierId, imp.alertLevel);
        }
      }
    }
    return map;
  }, [graph.suppliers, riskSummary.impacts]);

  // Weak spots: suppliers with no backup whose failure hurts within 10 days
  const weakSpots: WeakSpotItem[] = useMemo(() => {
    return graph.suppliers
      .filter((s) => s.isSingleSource || s.alternativesCount === 0)
      .map((supplier) => {
        const chain = findSupplyChain(graph, supplier.id);
        const daysToHurt =
          chain.length > 0
            ? chain.reduce((sum, n) => sum + n.stockDays, 0) + chain.length * 2
            : supplier.stockDays + 2;
        return { supplier, daysToHurt };
      })
      .filter((item) => item.daysToHurt <= 10)
      .sort((a, b) => a.daysToHurt - b.daysToHurt);
  }, [graph]);

  const weakSpotIds = useMemo(
    () => new Set(weakSpots.map((w) => w.supplier.id)),
    [weakSpots],
  );

  const handleSelectSupplier = (sup: SupplierNode | null) => {
    setSelectedSupplierId(sup?.id ?? null);
    if (sup) {
      recordAudit(cypherQueries.traceSupplierPathToBusiness(graph.business.id, sup.id));
    }
  };

  const handleShowHiddenLayers = () => {
    sharpenOuterRings();
    const firstL1 = graph.suppliers.find((s) => s.layer === 1)?.id ?? 'YOU';
    recordAudit(cypherQueries.discoverHiddenSuppliers(firstL1));
  };

  const handleToggleWeakSpots = () => {
    const next = !showWeakSpots;
    setShowWeakSpots(next);
    if (next) {
      if (!outerRingsDiscovered) {
        sharpenOuterRings();
      }
      recordAudit(cypherQueries.findWeakSpotsWithinDays(graph.business.id, 10));
    }
  };

  const updateFilters = (patch: Partial<ChainMapFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    recordAudit(
      cypherQueries.filterChainSuppliers(
        graph.business.id,
        next.layer,
        next.light,
        next.noBackupOnly,
      ),
    );
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemSupplied.trim() || !city.trim()) {
      setFormError(t.ui.fillSupplierFields);
      return;
    }
    setFormError(null);

    let derivedLayer: SupplierLayer = 1;
    if (toId !== 'YOU') {
      const targetSup = graph.suppliers.find((s) => s.id === toId);
      if (targetSup) {
        derivedLayer = targetSup.layer === 1 ? 2 : 3;
      }
    }

    addSupplier({
      name,
      itemSupplied,
      layer: derivedLayer,
      city,
      stockDays,
      toId,
      sharePct: 75,
      transitDays: derivedLayer === 1 ? 1 : 2,
    });
    setName('');
    setItemSupplied('');
    setToId('YOU');
    setShowAddForm(false);
  };

  const layerGroups: Array<{ layer: SupplierLayer; heading: string; color: string }> = [
    { layer: 1, heading: t.layers.layer1, color: 'var(--blue)' },
    { layer: 2, heading: t.layers.layer2, color: 'var(--amber)' },
    { layer: 3, heading: t.layers.layer3, color: 'var(--ember)' },
  ];

  const lightChipOptions: Array<{ value: AlertLevel | 'all'; label: string; dotColor?: string }> = [
    { value: 'all', label: 'All lights' },
    { value: 'critical', label: t.alerts.critical, dotColor: 'var(--risk-urgent)' },
    { value: 'warning', label: t.alerts.warning, dotColor: 'var(--risk-danger)' },
    { value: 'watch', label: t.alerts.watch, dotColor: 'var(--risk-watch)' },
    { value: 'safe', label: t.alerts.safe, dotColor: 'var(--risk-safe)' },
  ];

  const supplyTargetOptions = graph.suppliers.filter((s) => s.layer < 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-5"
    >
      {/* Top heading + primary action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {t.sections.chainMapHeading}
          </h1>
          <p className="mt-1 text-base text-[var(--muted)] max-w-2xl">
            Tap any supplier to light up its route to your door, or check where you have no backup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!outerRingsDiscovered && (
            <button
              type="button"
              onClick={handleShowHiddenLayers}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--amber)] px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>Show hidden layers</span>
            </button>
          )}

          <a
            href="#india-geo-map"
            className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--amber)]"
          >
            <MapPin className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
            <span>India Map</span>
          </a>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className={`min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              outerRingsDiscovered
                ? 'bg-[var(--amber)] text-[var(--amber-ink)] hover:brightness-105'
                : 'border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]'
            }`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t.controls.addSupplier}</span>
          </button>
        </div>
      </div>

      {isCustomShopActive && (
        <div className="surface-card px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[var(--text)]">
            {graph.business.businessName} · {graph.business.city}
          </span>
          <button
            type="button"
            onClick={openWorldPicker}
            className="min-h-[44px] inline-flex items-center px-2 text-xs font-semibold text-[var(--amber)] hover:underline"
          >
            Edit shop &amp; city
          </button>
        </div>
      )}

      {/* Filter chips + Find my weak spots */}
      <div className="instrument-panel p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Layer + No backup chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] mr-1">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Filter:</span>
            </span>

            {(
              [
                { value: 'all', label: 'All layers' },
                { value: 1, label: t.layers.layer1 },
                { value: 2, label: t.layers.layer2 },
                { value: 3, label: t.layers.layer3 },
              ] as const
            ).map((chip) => {
              const active = filters.layer === chip.value;
              return (
                <button
                  key={String(chip.value)}
                  type="button"
                  onClick={() => updateFilters({ layer: chip.value })}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
                      : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => updateFilters({ noBackupOnly: !filters.noBackupOnly })}
              aria-pressed={filters.noBackupOnly}
              className={`min-h-[44px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                filters.noBackupOnly
                  ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
                  : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.ui.noBackupOnly}
            </button>
          </div>

          {/* Find my weak spots button */}
          <button
            type="button"
            onClick={handleToggleWeakSpots}
            aria-pressed={showWeakSpots}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-xs sm:text-sm font-bold transition-colors shrink-0 ${
              showWeakSpots
                ? 'border-[var(--risk-urgent)] bg-[var(--risk-urgent)]/15 text-[var(--risk-urgent)]'
                : 'border-[var(--amber)] bg-[var(--panel)] text-[var(--amber)] hover:bg-[var(--amber)]/10'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>{showWeakSpots ? t.ui.hideWeakSpots : t.ui.findWeakSpots}</span>
          </button>
        </div>

        {/* Light colour chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--line)]">
          <span className="text-xs font-semibold text-[var(--muted)] mr-1">Light:</span>
          {lightChipOptions.map((opt) => {
            const active = filters.light === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilters({ light: opt.value })}
                aria-pressed={active}
                className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--text)]'
                    : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {opt.dotColor && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: opt.dotColor }}
                  />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}

          {(filters.layer !== 'all' || filters.light !== 'all' || filters.noBackupOnly) && (
            <button
              type="button"
              onClick={() =>
                updateFilters({ layer: 'all', light: 'all', noBackupOnly: false })
              }
              className="min-h-[44px] inline-flex items-center px-2 text-xs font-semibold text-[var(--amber)] hover:underline ml-auto"
            >
              {t.ui.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Weak spots explanation banner */}
      {showWeakSpots && (
        <div className="instrument-panel instrument-ticks border-[var(--risk-urgent)]/60 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--risk-urgent)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {weakSpots.length} weak spot{weakSpots.length === 1 ? '' : 's'} with no backup
                that hurt within 10 days
              </span>
            </h2>
          </div>

          {weakSpots.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {weakSpots.map(({ supplier, daysToHurt }) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelectSupplier(supplier)}
                  className="instrument-panel-raised p-3 text-left hover:border-[var(--risk-urgent)] transition-colors"
                >
                  <div className="font-semibold text-sm text-[var(--text)]">
                    {supplier.name}
                  </div>
                  <div className="text-xs font-bold text-[var(--risk-urgent)] mt-0.5">
                    If this one stops, you feel it in {daysToHurt} days
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    {supplier.city} · {supplier.itemSupplied}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--teal)]">
              No single-backup supplier will hurt you within 10 days right now.
            </p>
          )}
        </div>
      )}

      {/* Add supplier form (name, what they supply, city, who they supply, stock days) */}
      {showAddForm && (
        <form
          onSubmit={handleAddSupplier}
          noValidate
          className="instrument-panel instrument-ticks p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="font-display text-base font-bold text-[var(--text)]">
              {t.controls.addSupplier}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormError(null);
              }}
              className="min-h-[44px] inline-flex items-center px-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
            >
              {t.controls.close}
            </button>
          </div>
          {formError && (
            <p role="alert" className="text-xs font-semibold text-[var(--risk-urgent)]">
              {formError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Supplier name"
              aria-label="Supplier name"
              className="min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--amber)]"
              required
            />
            <input
              type="text"
              value={itemSupplied}
              onChange={(e) => {
                setItemSupplied(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="What they supply"
              aria-label="What they supply"
              className="min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--amber)]"
              required
            />
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="City"
              aria-label="City"
              className="min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--amber)]"
              required
            />
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              aria-label="Who they supply"
              className="deeptier-select text-sm"
            >
              <option value="YOU">Supplies: {graph.business.businessName} (Direct)</option>
              {supplyTargetOptions.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  Supplies: {sup.name} ({sup.city})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={60}
                value={stockDays}
                onChange={(e) => setStockDays(Number(e.target.value))}
                aria-label="Stock days"
                className="w-20 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2.5 text-base font-mono tabular-nums text-[var(--text)]"
              />
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl bg-[var(--amber)] px-4 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 whitespace-nowrap"
              >
                Add & Check
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lazy-loaded Interactive Column Chain Map + Zoom + Mini-map */}
      <MapErrorBoundary
        title={t.ui.mapLoadError}
        retryLabel={t.ui.tryAgain}
        heightClass="min-h-[380px]"
      >
        <Suspense
          fallback={<MapLoadingFallback label={t.ui.loadingMap} heightClass="min-h-[380px]" />}
        >
          <ChainMapCanvas
            graph={graph}
            outerRingsDiscovered={outerRingsDiscovered}
            selectedSupplierId={selectedSupplier?.id ?? null}
            onSelectSupplier={handleSelectSupplier}
            filters={filters}
            weakSpotIds={weakSpotIds}
            showWeakSpots={showWeakSpots}
          />
        </Suspense>
      </MapErrorBoundary>

      {/* Lazy-loaded Geographic India Map */}
      <MapErrorBoundary
        title={t.ui.mapLoadError}
        retryLabel={t.ui.tryAgain}
        heightClass="min-h-[420px]"
      >
        <Suspense
          fallback={<MapLoadingFallback label={t.ui.loadingMap} heightClass="min-h-[420px]" />}
        >
          <IndiaSupplyMap
            graph={graph}
            events={events}
            selectedEventId={selectedEventId}
            onSelectEventId={setSelectedEventId}
            onSelectSupplier={handleSelectSupplier}
            outerRingsDiscovered={outerRingsDiscovered}
          />
        </Suspense>
      </MapErrorBoundary>

      {/* Hidden upstream discovery suggestions */}
      {discoveredSuggestions.length > 0 && (
        <div className="instrument-panel instrument-ticks p-5 space-y-3">
          <h2 className="font-display text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
            <span>Hidden upstream suppliers found for your new vendors</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {discoveredSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="instrument-panel-raised p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">
                    {sug.proposedSupplier.name} ({sug.proposedSupplier.city})
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Supplies {sug.forLayer1SupplierName} · {sug.reasonPlain}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyDiscoveredSuggestion(sug.id)}
                  className="min-h-[44px] self-start rounded-xl border border-[var(--teal)] px-4 text-xs font-semibold text-[var(--teal)] hover:bg-[var(--teal)]/10"
                >
                  Add to chain map
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Layer Supplier List Directory */}
      <div className="grid gap-4 lg:grid-cols-3">
        {layerGroups.map((group) => {
          const items = graph.suppliers.filter((s) => s.layer === group.layer);
          const isFoggyLayer = group.layer > 1 && !outerRingsDiscovered;

          return (
            <div key={group.layer} className="instrument-panel p-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="font-display text-base font-bold text-[var(--text)] flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span>{group.heading}</span>
                </h2>
                <span className="font-mono text-xs font-semibold text-[var(--muted)] tabular-nums">
                  {items.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {items.map((sup) => {
                  const foggy = isFoggyLayer && !sup.verified;
                  return (
                    <li key={sup.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSupplier(sup)}
                        className={`w-full text-left instrument-panel-raised p-3 transition-all hover:border-[var(--amber)] ${
                          foggy ? 'opacity-65 blur-[0.4px]' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm text-[var(--text)]">
                            {sup.name}
                          </span>
                          <span className="font-mono text-xs text-[var(--teal)] tabular-nums shrink-0">
                            {sup.stockDays}d · {sup.onTimeDeliveryPct}%
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {sup.whatTheySupply}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--muted)]">
                          {sup.city} · Backup: {sup.alternateSuppliers[0] ?? 'None'}
                        </div>
                        {sup.isSingleSource && (
                          <div className="mt-1 text-xs font-semibold text-[var(--amber)]">
                            No backup supplier
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Tap-to-open Side Sheet */}
      <SupplierSideSheet
        supplier={selectedSupplier}
        graph={graph}
        light={selectedSupplier ? supplierLightMap.get(selectedSupplier.id) ?? 'safe' : 'safe'}
        onClose={() => setSelectedSupplierId(null)}
      />
    </motion.div>
  );
}
