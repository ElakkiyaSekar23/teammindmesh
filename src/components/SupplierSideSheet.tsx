import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, MapPin, Package, ShieldAlert, X } from 'lucide-react';
import { findSupplyChain, type AlertLevel, type SupplierNode, type SupplyChainGraph } from '../engine';
import { useDeepTier } from '../state/store';
import { MetricTooltip } from './MetricTooltip';
import { TrafficLightTag } from './RingMotif';

interface SupplierSideSheetProps {
  supplier: SupplierNode | null;
  graph: SupplyChainGraph;
  light: AlertLevel;
  onClose: () => void;
}

export function SupplierSideSheet({
  supplier,
  graph,
  light,
  onClose,
}: SupplierSideSheetProps) {
  const { t, updateSupplierStockDays } = useDeepTier();
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!supplier) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [supplier, onClose]);

  if (!supplier) return null;

  const chain = findSupplyChain(graph, supplier.id);
  const daysToHurt =
    chain.length > 0
      ? chain.reduce((s, n) => s + n.stockDays, 0) + chain.length * 2
      : supplier.stockDays + 2;
  const noBackup = supplier.isSingleSource || supplier.alternativesCount === 0;

  const layerLabel =
    supplier.layer === 1
      ? t.layers.layer1
      : supplier.layer === 2
        ? t.layers.layer2
        : t.layers.layer3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-sheet-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
        className="instrument-panel w-full max-w-md h-full overflow-y-auto rounded-none sm:rounded-l-2xl p-5 sm:p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <TrafficLightTag level={light} />
              <span className="text-xs font-semibold text-[var(--amber)]">{layerLabel}</span>
            </div>
            <h2
              id="supplier-sheet-title"
              className="font-display text-xl font-bold text-[var(--text)]"
            >
              {supplier.name}
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.controls.close}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)] shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Simple-words cards: What they supply, City, Stock days, Backup available?, Alternates */}
        <div className="space-y-3">
          <div className="instrument-panel-raised p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
              <Package className="h-3.5 w-3.5 text-[var(--teal)]" aria-hidden="true" />
              <span>What they supply</span>
            </div>
            <div className="text-sm font-bold text-[var(--text)]">{supplier.itemSupplied}</div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {supplier.whatTheySupply}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="instrument-panel-raised p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--blue)]" aria-hidden="true" />
                <span>City</span>
              </div>
              <div className="text-sm font-bold text-[var(--text)]">{supplier.city}</div>
              <div className="text-xs text-[var(--muted)]">{supplier.state}</div>
            </div>

            <div className="instrument-panel-raised p-4 space-y-1">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1">
                <span>Stock days</span>
                <MetricTooltip
                  label="Stock days"
                  explanation={t.metricTooltips.stockCushion}
                  align="right"
                />
              </div>
              <div className="font-mono text-xl font-bold text-[var(--teal)] tabular-nums">
                {supplier.stockDays} days
              </div>
              <div className="text-xs text-[var(--muted)] flex items-center gap-1">
                <span>
                  {supplier.onTimeDeliveryPct}% {t.ui.onTimeLabel}
                </span>
                <MetricTooltip
                  label={t.ui.onTimeLabel}
                  explanation={t.metricTooltips.onTimePct}
                  align="right"
                />
              </div>
            </div>
          </div>

          {/* Simple stock-days editor */}
          <div className="instrument-panel-raised p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text)]">Edit stock days here</span>
              <span className="font-mono text-[var(--amber)] tabular-nums">
                {supplier.stockDays}d
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={supplier.stockDays}
              aria-label={`${supplier.name} stock days`}
              onChange={(e) => updateSupplierStockDays(supplier.id, Number(e.target.value))}
              className="deeptier-range"
            />
          </div>

          {/* Backup available? */}
          <div
            className={`instrument-panel-raised p-4 space-y-2 ${
              noBackup ? 'border-[var(--amber)]' : 'border-[var(--teal)]/40'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              {noBackup ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-[var(--amber)] shrink-0" aria-hidden="true" />
                  <span className="text-[var(--amber)]">Backup available? No backup supplier</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
                  <span className="text-[var(--teal)]">
                    Backup available? Yes ({supplier.alternativesCount} option
                    {supplier.alternativesCount === 1 ? '' : 's'})
                  </span>
                </>
              )}
            </div>

            <div className="text-xs text-[var(--muted)] pt-1">
              <div className="font-semibold text-[var(--text)] mb-1">
                Where to find an alternate:
              </div>
              <ul className="space-y-1">
                {supplier.alternateSuppliers.map((alt, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)] shrink-0" />
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Path & impact days */}
          <div className="instrument-panel-raised p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
              <span>If this supplier stops, you feel it in {daysToHurt} days</span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Route to your door:{' '}
              {[...chain.map((s) => s.name), graph.business.businessName].join(' → ')}
            </p>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
