import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Candy,
  Car,
  Check,
  Coffee,
  Cpu,
  Crosshair,
  Factory,
  Hammer,
  MapPin,
  Pill,
  Plus,
  Search,
  Scissors,
  SlidersHorizontal,
  Store,
  Utensils,
  Wheat,
  Wrench,
  X,
} from 'lucide-react';
import {
  buildCustomShopGraph,
  getShopCategoryMeta,
  PRODUCT_TEMPLATES,
  QUICK_SHOP_CITIES,
  SHOP_CATEGORIES,
  type BuilderProductId,
  type CustomProductSpec,
  type ShopBuilderConfig,
  type ShopCategoryId,
} from '../data/shopBuilder';
import { deepTierService, type AppRoute } from '../engine';
import { useDeepTier } from '../state/store';

interface WorldPickerViewProps {
  onNavigate: (route: AppRoute) => void;
}

const SHOP_TYPE_ICONS: Record<ShopCategoryId, React.ReactNode> = {
  tea_stall: <Store className="h-4 w-4" aria-hidden="true" />,
  bakery: <Hammer className="h-4 w-4" aria-hidden="true" />,
  kirana: <Wheat className="h-4 w-4" aria-hidden="true" />,
  restaurant: <Utensils className="h-4 w-4" aria-hidden="true" />,
  sweet_shop: <Candy className="h-4 w-4" aria-hidden="true" />,
  cafe: <Coffee className="h-4 w-4" aria-hidden="true" />,
  medical_store: <Pill className="h-4 w-4" aria-hidden="true" />,
  hardware_shop: <Wrench className="h-4 w-4" aria-hidden="true" />,
  electronics: <Cpu className="h-4 w-4" aria-hidden="true" />,
  garment_shop: <Scissors className="h-4 w-4" aria-hidden="true" />,
  auto_garage: <Car className="h-4 w-4" aria-hidden="true" />,
  stationery: <BookOpen className="h-4 w-4" aria-hidden="true" />,
  custom: <Plus className="h-4 w-4" aria-hidden="true" />,
};

export function WorldPickerView({ onNavigate }: WorldPickerViewProps) {
  const { t, shopBuilderConfig, selectDemoWorld, applyCustomShop } = useDeepTier();

  const [tab, setTab] = useState<'builder' | 'samples'>('builder');
  const [draftConfig, setDraftConfig] = useState<ShopBuilderConfig>(() => ({
    ...shopBuilderConfig,
    selectedProducts: [...shopBuilderConfig.selectedProducts],
    customProducts: [...(shopBuilderConfig.customProducts ?? [])],
    stockDaysBySupplierId: { ...shopBuilderConfig.stockDaysBySupplierId },
  }));

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [cityQuery, setCityQuery] = useState(shopBuilderConfig.shopCity ?? 'Chennai');
  const [cityResults, setCityResults] = useState<
    Array<{ city: string; state: string; lat: number; lng: number }>
  >([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const previewGraph = useMemo(() => buildCustomShopGraph(draftConfig), [draftConfig]);

  useEffect(() => {
    const clean = cityQuery.trim();
    if (clean.length < 2 || clean.toLowerCase() === (draftConfig.shopCity ?? '').toLowerCase()) {
      setCityResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const results = await deepTierService.searchLocations(clean);
        setCityResults(results);
      } catch {
        setCityResults([]);
      } finally {
        setIsSearchingCity(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [cityQuery, draftConfig.shopCity]);

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Browser location is not supported.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await deepTierService.reverseGeocodeLocation(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setCityQuery(loc.city);
          setCityResults([]);
          setDraftConfig((prev) => ({
            ...prev,
            shopCity: loc.city,
            shopState: loc.state,
            shopLat: loc.lat,
            shopLng: loc.lng,
            liveNodeAdjustments: {},
          }));
        } catch (err) {
          setGeoError(err instanceof Error ? err.message : 'Could not detect your city.');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setGeoError('Location permission denied. Type your city instead.');
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const handlePickLocation = (loc: {
    city: string;
    state?: string;
    lat?: number;
    lng?: number;
  }) => {
    setCityQuery(loc.city);
    setCityResults([]);
    setGeoError(null);
    setDraftConfig((prev) => ({
      ...prev,
      shopCity: loc.city,
      shopState: loc.state,
      shopLat: loc.lat,
      shopLng: loc.lng,
      liveNodeAdjustments: {},
    }));
  };

  const handleSelectShopCategory = (catId: ShopCategoryId) => {
    const meta = getShopCategoryMeta(catId);
    const presetNames = new Set(SHOP_CATEGORIES.map((c) => c.defaultShopName.toLowerCase()));
    setDraftConfig((prev) => {
      const currentClean = prev.shopName.trim();
      const shouldUpdateName =
        !currentClean || presetNames.has(currentClean.toLowerCase());
      return {
        ...prev,
        shopCategory: catId,
        shopName: shouldUpdateName ? meta.defaultShopName : prev.shopName,
        selectedProducts: [...meta.defaultProducts],
      };
    });
  };

  const handleToggleProduct = (productId: BuilderProductId) => {
    setDraftConfig((prev) => {
      const exists = prev.selectedProducts.includes(productId);
      const totalSelected =
        prev.selectedProducts.length + (prev.customProducts?.length ?? 0);
      if (exists && totalSelected <= 1) return prev;
      const next = exists
        ? prev.selectedProducts.filter((p) => p !== productId)
        : [...prev.selectedProducts, productId];
      return { ...prev, selectedProducts: next };
    });
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const label = customItemName.trim();
    if (!label) return;
    const slug = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newItem: CustomProductSpec = {
      id: slug,
      label,
      group: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      defaultStockDays: 4,
    };
    setDraftConfig((prev) => ({
      ...prev,
      customProducts: [...(prev.customProducts ?? []), newItem],
    }));
    setCustomItemName('');
    setEditingItemId(slug);
  };

  const handleRemoveCustomItem = (id: string) => {
    setDraftConfig((prev) => {
      const nextCustom = (prev.customProducts ?? []).filter((c) => c.id !== id);
      if (nextCustom.length === 0 && prev.selectedProducts.length === 0) return prev;
      return { ...prev, customProducts: nextCustom };
    });
  };

  const handleSliderChange = (supplierId: string, days: number) => {
    setDraftConfig((prev) => ({
      ...prev,
      stockDaysBySupplierId: {
        ...prev.stockDaysBySupplierId,
        [supplierId]: days,
      },
    }));
  };

  const handleSaveCustomShop = () => {
    const cleanCity = (cityQuery || draftConfig.shopCity || 'Chennai').trim() || 'Chennai';
    applyCustomShop({
      ...draftConfig,
      shopCity: cleanCity,
      liveNodeAdjustments: {},
    });
    onNavigate('overview');
  };

  const handleOpenDemo = (persona: 'shop' | 'factory') => {
    selectDemoWorld(persona);
    onNavigate('overview');
  };

  // Group previewGraph suppliers into Layer 1/2/3 chains per item id
  const chainRows = useMemo(() => {
    const rows: Array<{
      itemId: string;
      label: string;
      l1Id: string;
      l2Id: string;
      l3Id: string;
      l1Name: string;
      l1City: string;
      l1Days: number;
      l2Name: string;
      l2City: string;
      l2State: string;
      l2Days: number;
      l3Name: string;
      l3City: string;
      l3State: string;
      l3Days: number;
      transitTotal: number;
      l1Runway: number;
    }> = [];

    const l1Nodes = previewGraph.suppliers.filter((s) => s.layer === 1);
    for (const l1 of l1Nodes) {
      const itemId = l1.id.replace(/^custom-l1-/, '');
      const l2Id = `custom-l2-${itemId}`;
      const l3Id = `custom-l3-${itemId}`;
      const l2 = previewGraph.suppliers.find((s) => s.id === l2Id);
      const l3 = previewGraph.suppliers.find((s) => s.id === l3Id);
      if (!l2 || !l3) continue;
      const t1 = previewGraph.links.find((l) => l.fromId === l1.id && l.toId === 'YOU')?.transitDays ?? 1;
      const t2 = previewGraph.links.find((l) => l.fromId === l2.id && l.toId === l1.id)?.transitDays ?? 2;
      const t3 = previewGraph.links.find((l) => l.fromId === l3.id && l.toId === l2.id)?.transitDays ?? 2;
      rows.push({
        itemId,
        label: l1.itemSupplied,
        l1Id: l1.id,
        l2Id: l2.id,
        l3Id: l3.id,
        l1Name: l1.name,
        l1City: l1.city,
        l1Days: l1.stockDays,
        l2Name: l2.name,
        l2City: l2.city,
        l2State: l2.state,
        l2Days: l2.stockDays,
        l3Name: l3.name,
        l3City: l3.city,
        l3State: l3.state,
        l3Days: l3.stockDays,
        transitTotal: t1 + t2 + t3,
        l1Runway: l1.stockDays + t1,
      });
    }
    return rows;
  }, [previewGraph.links, previewGraph.suppliers]);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Clean Workspace Header + Segmented Mode Switch */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            {tab === 'builder' ? 'Set up your shop' : t.worldPicker.heading}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {tab === 'builder'
              ? 'Regional Tier 2 & Tier 3 suppliers adapt automatically to your city.'
              : t.worldPicker.subheading}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Workspace setup mode"
          className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'builder'}
            onClick={() => setTab('builder')}
            className={`min-h-[44px] rounded-lg px-4 text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'builder'
                ? 'bg-[var(--navy)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Build my shop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'samples'}
            onClick={() => setTab('samples')}
            className={`min-h-[44px] rounded-lg px-4 text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'samples'
                ? 'bg-[var(--navy)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Sample worlds
          </button>
        </div>
      </div>

      {tab === 'samples' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--teal)] font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  <span>Retail Shop Demo</span>
                </span>
                <span>Chennai</span>
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text)]">
                {t.worldPicker.smallShopTitle}
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {t.worldPicker.smallShopDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDemo('shop')}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--amber)] px-5 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105"
            >
              <span>{t.worldPicker.smallShopCta}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="surface-card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--blue)] font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Factory className="h-4 w-4" aria-hidden="true" />
                  <span>Manufacturing Demo</span>
                </span>
                <span>Hosur</span>
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text)]">
                {t.worldPicker.factoryTitle}
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {t.worldPicker.factoryDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDemo('factory')}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-5 text-sm font-bold text-[var(--text)] hover:border-[var(--blue)]"
            >
              <span>{t.worldPicker.factoryCta}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Location & Shop Identity */}
          <section className="surface-card p-4 sm:p-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--muted)]">
                <span>{t.worldPicker.shopNameLabel}</span>
                <input
                  type="text"
                  value={draftConfig.shopName}
                  onChange={(e) =>
                    setDraftConfig((prev) => ({ ...prev, shopName: e.target.value }))
                  }
                  placeholder="My Shop Name"
                  className="min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-sm font-medium text-[var(--text)] focus:border-[var(--amber)]"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--muted)]">
                  City or town (India)
                </span>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={cityQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCityQuery(val);
                        setDraftConfig((prev) => ({
                          ...prev,
                          shopCity: val,
                          shopLat: undefined,
                          shopLng: undefined,
                          shopState: undefined,
                          liveNodeAdjustments: {},
                        }));
                      }}
                      placeholder="Type any Indian city..."
                      aria-label="Shop city or town"
                      className="min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] pl-9 pr-3 text-sm font-medium text-[var(--text)] focus:border-[var(--amber)]"
                    />

                    {(cityResults.length > 0 || isSearchingCity) && (
                      <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-xl border border-[var(--line)] bg-[var(--navy)] shadow-lg overflow-hidden">
                        {isSearchingCity && cityResults.length === 0 ? (
                          <div className="px-3.5 py-2.5 text-xs text-[var(--muted)]">
                            Searching places...
                          </div>
                        ) : (
                          cityResults.map((loc) => (
                            <button
                              key={`${loc.city}-${loc.lat}-${loc.lng}`}
                              type="button"
                              onClick={() => handlePickLocation(loc)}
                              className="w-full min-h-[44px] px-3.5 py-2 text-left text-xs sm:text-sm hover:bg-[var(--panel)] flex items-center justify-between gap-2 border-b last:border-b-0 border-[var(--line)]"
                            >
                              <span className="font-semibold text-[var(--text)]">{loc.city}</span>
                              <span className="text-[var(--muted)]">{loc.state}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={geoLoading}
                    className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--teal)] hover:border-[var(--teal)] whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{geoLoading ? 'Locating...' : 'Use GPS'}</span>
                  </button>
                </div>

                {geoError && (
                  <p className="text-xs text-[var(--risk-watch)]">{geoError}</p>
                )}
              </div>
            </div>

            {/* Quick Cities */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_SHOP_CITIES.map((cityName) => {
                const active =
                  (draftConfig.shopCity ?? '').trim().toLowerCase() ===
                  cityName.toLowerCase();
                return (
                  <button
                    key={cityName}
                    type="button"
                    onClick={() => handlePickLocation({ city: cityName })}
                    aria-pressed={active}
                    className={`min-h-[38px] rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[var(--teal)] bg-[var(--teal)]/12 text-[var(--teal)] font-semibold'
                        : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {cityName}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Shop Type (12 + Custom) */}
          <section className="surface-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Business type</h2>
              <span className="text-xs text-[var(--muted)]">12 presets + custom</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {SHOP_CATEGORIES.map((cat) => {
                const active = draftConfig.shopCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectShopCategory(cat.id)}
                    aria-pressed={active}
                    className={`min-h-[44px] flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors text-left ${
                      active
                        ? 'border-[var(--amber)] bg-[var(--amber)]/12 text-[var(--text)]'
                        : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span
                      className="shrink-0"
                      style={{ color: active ? 'var(--amber)' : 'currentColor' }}
                    >
                      {SHOP_TYPE_ICONS[cat.id]}
                    </span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {draftConfig.shopCategory === 'custom' && (
              <input
                type="text"
                value={draftConfig.customCategoryLabel ?? ''}
                onChange={(e) =>
                  setDraftConfig((prev) => ({
                    ...prev,
                    customCategoryLabel: e.target.value,
                  }))
                }
                placeholder="Describe your shop type (e.g. Florist, Dry Cleaner, Dairy Farm)"
                aria-label="Custom business type"
                className="min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-sm text-[var(--text)] focus:border-[var(--amber)]"
              />
            )}
          </section>

          {/* 3. Key Items & Custom Products */}
          <section className="surface-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                What you buy &amp; sell
              </h2>
              <span className="font-mono text-xs text-[var(--teal)] tabular-nums">
                {chainRows.length} active chains
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRODUCT_TEMPLATES.map((prod) => {
                const checked = draftConfig.selectedProducts.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleToggleProduct(prod.id)}
                    aria-pressed={checked}
                    className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      checked
                        ? 'border-[var(--teal)] bg-[var(--teal)]/12 text-[var(--text)]'
                        : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5 text-[var(--teal)]" aria-hidden="true" />}
                    <span>{prod.label}</span>
                  </button>
                );
              })}

              {(draftConfig.customProducts ?? []).map((cp) => (
                <div
                  key={cp.id}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-[var(--amber)] bg-[var(--amber)]/12 pl-3 pr-1.5 text-xs font-semibold text-[var(--text)]"
                >
                  <span>{cp.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomItem(cp.id)}
                    aria-label={`Remove ${cp.label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCustomItem} className="flex gap-2 pt-1">
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Add another item (e.g. Paneer, Cement, Paper)..."
                aria-label="Add custom item"
                className="min-h-[44px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-sm text-[var(--text)] focus:border-[var(--amber)]"
              />
              <button
                type="submit"
                disabled={!customItemName.trim()}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)] disabled:opacity-45"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add item</span>
              </button>
            </form>
          </section>

          {/* 4. Dynamic 3-Layer Regional Preview */}
          <section className="surface-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Resolved supply routes for {previewGraph.business.city}
                </h2>
              </div>
              <span className="text-xs text-[var(--muted)]">
                Tap any row to adjust stock days
              </span>
            </div>

            <div className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--panel)] overflow-hidden">
              {chainRows.map((row) => {
                const isOpen = editingItemId === row.itemId;
                return (
                  <div key={row.itemId}>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(isOpen ? null : row.itemId)}
                      aria-expanded={isOpen}
                      className="w-full min-h-[54px] px-4 py-3 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-[var(--navy)]/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {row.label}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--muted)] flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[var(--blue)] font-medium">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            <span>L1 {row.l1City}</span>
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="text-[var(--amber)] font-medium">
                            L2 {row.l2Name} ({row.l2City})
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="text-[var(--ember)] font-medium">
                            L3 {row.l3Name} ({row.l3City})
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-semibold text-[var(--teal)] tabular-nums shrink-0">
                        {row.l1Runway}d L1 · {row.l1Days + row.l2Days + row.l3Days + row.transitTotal}d chain
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-[var(--line)] bg-[var(--navy)]/50 px-4 py-3 grid gap-4 md:grid-cols-3">
                        {[
                          { id: row.l1Id, layer: 'Layer 1', name: row.l1Name, days: row.l1Days },
                          { id: row.l2Id, layer: 'Layer 2', name: row.l2Name, days: row.l2Days },
                          { id: row.l3Id, layer: 'Layer 3', name: row.l3Name, days: row.l3Days },
                        ].map((node) => (
                          <div key={node.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-[var(--muted)] truncate">
                                {node.layer} · {node.name}
                              </span>
                              <span className="font-mono font-bold text-[var(--amber)] tabular-nums shrink-0">
                                {node.days}d
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={30}
                              value={node.days}
                              aria-label={`${node.name} stock days`}
                              onChange={(e) =>
                                handleSliderChange(node.id, Number(e.target.value))
                              }
                              className="deeptier-range"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-[var(--muted)]">
                Scans live weather, road disruptions &amp; market feeds for{' '}
                <strong className="text-[var(--text)]">{previewGraph.business.city}</strong> and its regional hubs.
              </p>
              <button
                type="button"
                onClick={handleSaveCustomShop}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--amber)] px-6 text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
              >
                <span>Create shop &amp; scan live world</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
