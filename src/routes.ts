import { useEffect, useState } from 'react';
import type { AppRoute } from './engine/types';

export const APP_SHELL_ROUTES: AppRoute[] = [
  'overview',
  'chain-map',
  'news-watch',
  'ripple',
  'actions',
];

export const VALID_ROUTES: AppRoute[] = ['landing', ...APP_SHELL_ROUTES];

export function parseHashRoute(hashValue: string): AppRoute {
  const cleaned = hashValue.replace(/^#\/?/, '').split('?')[0].trim();
  if (!cleaned) {
    return 'landing';
  }
  return VALID_ROUTES.includes(cleaned as AppRoute)
    ? (cleaned as AppRoute)
    : 'landing';
}

export function navigateToRoute(route: AppRoute): void {
  if (route === 'landing') {
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
    return;
  }
  const target = `#/${route}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') return 'landing';
    return parseHashRoute(window.location.hash);
  });

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return [route, navigateToRoute];
}
