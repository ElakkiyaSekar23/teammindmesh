/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { DesktopLeftRail } from './components/DesktopLeftRail';
import { LandingPage } from './components/LandingPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TopBar } from './components/TopBar';
import { WhyModal } from './components/WhyModal';
import { WorldPickerView } from './components/WorldPickerView';
import type { WhyExplanation } from './engine';
import { useHashRoute } from './routes';
import { ActionsSection } from './sections/ActionsSection';
import { ChainMapSection } from './sections/ChainMapSection';
import { NewsWatchSection } from './sections/NewsWatchSection';
import { OverviewSection } from './sections/OverviewSection';
import { RippleSection } from './sections/RippleSection';
import { DeepTierProvider, useDeepTier } from './state/store';

function DeepTierShell() {
  const [route, navigate] = useHashRoute();
  const [activeWhy, setActiveWhy] = useState<WhyExplanation | null>(null);
  const { isWorldPickerOpen, openWorldPicker, selectDemoWorld } = useDeepTier();

  if (route === 'landing') {
    return (
      <LandingPage
        onStart={() => {
          openWorldPicker();
          navigate('overview');
        }}
        onTryFactory={() => {
          selectDemoWorld('factory');
          navigate('overview');
        }}
      />
    );
  }

  return (
    <div className="deeptier-canvas-bg min-h-screen text-[var(--text)] pb-20 md:pb-0 flex flex-col">
      <TopBar onNavigate={navigate} />

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <DesktopLeftRail currentRoute={route} onNavigate={navigate} />

        <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7">
          {isWorldPickerOpen ? (
            <WorldPickerView onNavigate={navigate} />
          ) : (
            <>
              {route === 'overview' && (
                <OverviewSection onNavigate={navigate} onExplain={setActiveWhy} />
              )}
              {route === 'chain-map' && <ChainMapSection />}
              {route === 'ripple' && (
                <RippleSection onExplain={setActiveWhy} onNavigate={navigate} />
              )}
              {route === 'news-watch' && <NewsWatchSection onNavigate={navigate} />}
              {route === 'actions' && <ActionsSection onNavigate={navigate} />}
            </>
          )}
        </main>
      </div>

      <MobileBottomNav currentRoute={route} onNavigate={navigate} />
      <WhyModal explanation={activeWhy} onClose={() => setActiveWhy(null)} />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DeepTierProvider>
        <DeepTierShell />
      </DeepTierProvider>
    </MotionConfig>
  );
}
