import React from 'react';
import { Activity, CheckSquare, Home, Network, Newspaper } from 'lucide-react';
import type { AppRoute } from '../engine';
import { useDeepTier } from '../state/store';

interface MobileBottomNavProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export function MobileBottomNav({ currentRoute, onNavigate }: MobileBottomNavProps) {
  const { t, isWorldPickerOpen, closeWorldPicker } = useDeepTier();

  const items: Array<{ route: AppRoute; label: string; icon: React.ReactNode }> = [
    { route: 'overview', label: t.nav.overview, icon: <Home className="h-5 w-5" aria-hidden="true" /> },
    { route: 'chain-map', label: t.nav.chainMap, icon: <Network className="h-5 w-5" aria-hidden="true" /> },
    { route: 'ripple', label: t.nav.ripple, icon: <Activity className="h-5 w-5" aria-hidden="true" /> },
    { route: 'news-watch', label: t.nav.newsWatch, icon: <Newspaper className="h-5 w-5" aria-hidden="true" /> },
    { route: 'actions', label: t.nav.actions, icon: <CheckSquare className="h-5 w-5" aria-hidden="true" /> },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden h-14 border-t border-[var(--line)] bg-[var(--navy)]/95 backdrop-blur-md"
    >
      <div className="grid h-full grid-cols-5 items-center">
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
              className={`flex h-full min-h-[48px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-[var(--amber)] ${
                active ? 'text-[var(--amber)] font-bold' : 'text-[var(--muted)]'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
