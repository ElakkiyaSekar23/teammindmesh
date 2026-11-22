import React from 'react';
import { Activity, CheckSquare, Compass, Home, Network, Newspaper } from 'lucide-react';
import type { AppRoute } from '../engine';
import { useDeepTier } from '../state/store';

interface DesktopLeftRailProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export function DesktopLeftRail({ currentRoute, onNavigate }: DesktopLeftRailProps) {
  const {
    t,
    graph,
    persona,
    isCustomShopActive,
    selectDemoWorld,
    isWorldPickerOpen,
    closeWorldPicker,
    openWorldPicker,
  } = useDeepTier();

  const items: Array<{ route: AppRoute; label: string; icon: React.ReactNode }> = [
    { route: 'overview', label: t.nav.overview, icon: <Home className="h-4 w-4" aria-hidden="true" /> },
    { route: 'chain-map', label: t.nav.chainMap, icon: <Network className="h-4 w-4" aria-hidden="true" /> },
    { route: 'ripple', label: t.nav.ripple, icon: <Activity className="h-4 w-4" aria-hidden="true" /> },
    { route: 'news-watch', label: t.nav.newsWatch, icon: <Newspaper className="h-4 w-4" aria-hidden="true" /> },
    { route: 'actions', label: t.nav.actions, icon: <CheckSquare className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex md:w-56 md:flex-col md:justify-between border-r border-[var(--line)] bg-[var(--navy)] p-3.5 shrink-0"
    >
      <div className="space-y-1">
        {items.map((item) => {
          const active = !isWorldPickerOpen && currentRoute === item.route;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => {
                closeWorldPicker();
                onNavigate(item.route);
              }}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[var(--panel)] text-[var(--text)] border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50 border border-transparent'
              }`}
            >
              <span style={{ color: active ? 'var(--amber)' : 'currentColor' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-2">
          <button
            type="button"
            onClick={openWorldPicker}
            aria-current={isWorldPickerOpen ? 'page' : undefined}
            className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              isWorldPickerOpen
                ? 'bg-[var(--panel)] text-[var(--amber)] border border-[var(--amber)]'
                : 'text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
            }`}
          >
            <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t.controls.pickWorld}</span>
          </button>
        </div>
      </div>

      <div className="surface-card bg-[var(--panel)] p-3 text-xs space-y-2.5">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--navy)] p-0.5 border border-[var(--line)]">
          <button
            type="button"
            onClick={() => {
              selectDemoWorld('shop');
              onNavigate('overview');
            }}
            aria-pressed={!isWorldPickerOpen && persona === 'shop' && !isCustomShopActive}
            className={`min-h-[34px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
              !isWorldPickerOpen && persona === 'shop' && !isCustomShopActive
                ? 'bg-[var(--panel)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Demo Shop
          </button>
          <button
            type="button"
            onClick={() => {
              selectDemoWorld('factory');
              onNavigate('overview');
            }}
            aria-pressed={!isWorldPickerOpen && persona === 'factory'}
            className={`min-h-[34px] rounded-md px-2 text-[11px] font-semibold transition-colors ${
              !isWorldPickerOpen && persona === 'factory'
                ? 'bg-[var(--panel)] text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Factory
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="font-semibold text-[var(--text)] truncate">
            {graph.business.businessName}
          </div>
          <div className="text-[var(--muted)] truncate">
            {graph.business.city} · {graph.suppliers.length} suppliers
          </div>
        </div>
      </div>
    </aside>
  );
}
