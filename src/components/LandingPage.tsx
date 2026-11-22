import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Factory, Moon, Play, Sun } from 'lucide-react';
import type { RiskEventType, UiLanguage } from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';
import { HAZARD_ICON } from './hazardIcons';
import { LandingRadar } from './LandingRadar';
import { MetricTooltip } from './MetricTooltip';
import { RingLogo } from './RingMotif';

interface LandingPageProps {
  onStart: () => void;
  onTryFactory: () => void;
}

const LANG_OPTIONS: Array<{ code: UiLanguage; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिं' },
];

const RISK_TYPE_ITEMS: Array<{ type: RiskEventType; label: string }> = [
  { type: 'flood', label: 'Flood' },
  { type: 'cyclone', label: 'Cyclone' },
  { type: 'heatwave', label: 'Heatwave' },
  { type: 'water_shortage', label: 'Water shortage' },
  { type: 'power_outage', label: 'Power outage' },
  { type: 'transport_strike', label: 'Transport strike' },
  { type: 'port_congestion', label: 'Port jam' },
  { type: 'highway_blockade', label: 'Road blockade' },
  { type: 'factory_fire', label: 'Factory fire' },
  { type: 'crop_disease', label: 'Crop disease' },
  { type: 'cattle_disease', label: 'Cattle disease' },
  { type: 'raw_material_shortage', label: 'Material shortage' },
  { type: 'export_ban', label: 'Export ban' },
  { type: 'gas_shortage', label: 'Gas shortage' },
  { type: 'material_price_spike', label: 'Material price jump' },
  { type: 'fuel_price_hike', label: 'Fuel price hike' },
  { type: 'supplier_shutdown', label: 'Supplier shutdown' },
  { type: 'cyber_attack', label: 'Cyber attack' },
];

export function LandingPage({ onStart, onTryFactory }: LandingPageProps) {
  const { language, setLanguage, theme, toggleTheme, t } = useDeepTier();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [storyStep, setStoryStep] = useState<number>(0);
  const [isPlayingStory, setIsPlayingStory] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlayingStory) return;
    const timer = window.setInterval(() => {
      setStoryStep((prev) => {
        if (prev >= 2) {
          setIsPlayingStory(false);
          return 2;
        }
        return prev + 1;
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isPlayingStory]);

  const handleWatchStory = () => {
    setStoryStep(0);
    setIsPlayingStory(true);
    const el = document.getElementById('tea-stall-story');
    if (el) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="deeptier-canvas-bg min-h-screen text-[var(--text)] flex flex-col">
      {/* Clean landing header */}
      <header className="sticky top-0 z-30 min-h-14 border-b border-[var(--line)] bg-[var(--navy)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-1 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="#/"
              className="flex min-h-[44px] items-center gap-2 font-display text-base sm:text-lg font-bold tracking-tight text-[var(--text)] whitespace-nowrap shrink-0"
            >
              <RingLogo size={24} />
              <span>{t.brandName}</span>
            </a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <div
              role="group"
              aria-label={t.controls.languageLabel}
              className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5"
            >
              {LANG_OPTIONS.map((opt) => {
                const active = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setLanguage(opt.code)}
                    aria-pressed={active}
                    className={`min-h-[44px] min-w-[38px] px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--navy)] text-[var(--text)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t.controls.themeLight : t.controls.themeDark}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={onStart}
              className="min-h-[44px] rounded-lg bg-[var(--amber)] px-3 sm:px-4 text-xs sm:text-sm font-bold text-[var(--amber-ink)] hover:brightness-105 whitespace-nowrap"
            >
              {t.ui.startNowCta}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Full-screen Hero */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 min-h-[calc(100vh-3.5rem)] flex items-center py-10 sm:py-14">
          <div className="grid w-full items-center gap-10 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)]">
                For local shops &amp; factory buyers
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text)] leading-[1.08] text-balance">
                See the suppliers behind your suppliers.
              </h1>

              <p className="text-lg sm:text-xl text-[var(--muted)] max-w-xl leading-relaxed">
                Get warned before their problems become yours.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onStart}
                  className="min-h-[54px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--amber)] px-7 py-3 text-base font-bold text-[var(--amber-ink)] hover:brightness-105 transition-transform active:scale-[0.98]"
                >
                  <span>{t.ui.startNowCta}</span>
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleWatchStory}
                  className="min-h-[54px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-3 text-base font-semibold text-[var(--text)] hover:border-[var(--teal)] transition-colors"
                >
                  <Play className="h-4 w-4 text-[var(--teal)]" aria-hidden="true" />
                  <span>Watch the 60-second story</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <LandingRadar />
            </motion.div>
          </div>
        </section>

        {/* (1) Three-panel illustrated story using a tea stall */}
        <section
          id="tea-stall-story"
          className="border-t border-[var(--line)] bg-[var(--navy)]/50 py-14 sm:py-18"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--amber)]">
                  60-second story · Why hidden layers matter
                </div>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
                  How a flood far away empties your tea stall kettle
                </h2>
              </div>
              <button
                type="button"
                onClick={handleWatchStory}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 text-xs font-semibold text-[var(--teal)] hover:border-[var(--teal)] self-start"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isPlayingStory ? `Playing step ${storyStep + 1} of 3` : 'Play story'}</span>
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {/* Panel 1 */}
              <button
                type="button"
                onClick={() => {
                  setIsPlayingStory(false);
                  setStoryStep(0);
                }}
                className={`instrument-panel instrument-ticks p-5 text-left flex flex-col justify-between gap-4 transition-all ${
                  storyStep === 0 ? 'border-[var(--teal)] ring-1 ring-[var(--teal)]/40' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--teal)]">STEP 1 · LAYER 1</span>
                    <span className="text-[var(--muted)]">What you see</span>
                  </div>

                  {/* Custom SVG: Tea stall + milk vendor */}
                  <svg
                    viewBox="0 0 280 150"
                    className="w-full h-36 rounded-xl bg-[var(--ink)]/60 border border-[var(--line)]"
                    aria-hidden="true"
                  >
                    {/* Tea stall counter */}
                    <rect x="24" y="88" width="90" height="40" rx="6" fill="var(--panel)" stroke="var(--teal)" strokeWidth="2" />
                    <path d="M18 88 L120 88 L112 72 L26 72 Z" fill="var(--teal)" fillOpacity="0.25" stroke="var(--teal)" strokeWidth="1.5" />
                    {/* Steaming tea cup */}
                    <rect x="54" y="54" width="24" height="18" rx="4" fill="var(--amber)" />
                    <path d="M60 47 Q63 40 60 35 M69 47 Q72 40 69 35" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                    {/* Arrow */}
                    <path d="M126 92 L166 92" stroke="var(--blue)" strokeWidth="2.5" strokeDasharray="4 4" />
                    <path d="M160 86 L168 92 L160 98" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Milk vendor & steel milk can */}
                    <rect x="182" y="62" width="52" height="66" rx="8" fill="var(--panel)" stroke="var(--blue)" strokeWidth="2" />
                    <rect x="195" y="46" width="26" height="16" rx="4" fill="var(--blue)" />
                    <circle cx="208" cy="95" r="14" fill="var(--blue)" fillOpacity="0.2" stroke="var(--blue)" strokeWidth="1.5" />
                    <text x="208" y="99" textAnchor="middle" className="fill-[var(--text)] text-[10px] font-bold">
                      MILK
                    </text>
                  </svg>
                </div>

                <p className="font-display text-lg font-semibold text-[var(--text)]">
                  You buy milk from a vendor
                </p>
              </button>

              {/* Panel 2 */}
              <button
                type="button"
                onClick={() => {
                  setIsPlayingStory(false);
                  setStoryStep(1);
                }}
                className={`instrument-panel instrument-ticks p-5 text-left flex flex-col justify-between gap-4 transition-all ${
                  storyStep === 1 ? 'border-[var(--amber)] ring-1 ring-[var(--amber)]/40' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--amber)]">STEP 2 · LAYER 2</span>
                    <span className="text-[var(--muted)]">Hidden behind them</span>
                  </div>

                  {/* Custom SVG: Milk tanker + dairy farm co-op */}
                  <svg
                    viewBox="0 0 280 150"
                    className="w-full h-36 rounded-xl bg-[var(--ink)]/60 border border-[var(--line)]"
                    aria-hidden="true"
                  >
                    {/* Tanker */}
                    <rect x="24" y="76" width="84" height="36" rx="14" fill="var(--panel)" stroke="var(--blue)" strokeWidth="2" />
                    <rect x="92" y="84" width="24" height="28" rx="4" fill="var(--blue)" fillOpacity="0.35" stroke="var(--blue)" strokeWidth="1.5" />
                    <circle cx="46" cy="116" r="8" fill="var(--amber)" />
                    <circle cx="96" cy="116" r="8" fill="var(--amber)" />
                    {/* Link arrow */}
                    <path d="M126 92 L162 92" stroke="var(--amber)" strokeWidth="2.5" strokeDasharray="4 4" />
                    <path d="M156 86 L164 92 L156 98" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Dairy farm barn */}
                    <path d="M174 74 L216 40 L258 74 L258 124 L174 124 Z" fill="var(--panel)" stroke="var(--amber)" strokeWidth="2" />
                    <rect x="202" y="90" width="28" height="34" rx="3" fill="var(--amber)" fillOpacity="0.25" stroke="var(--amber)" strokeWidth="1.5" />
                    <circle cx="216" cy="64" r="6" fill="var(--teal)" />
                  </svg>
                </div>

                <p className="font-display text-lg font-semibold text-[var(--text)]">
                  The vendor buys from a farm
                </p>
              </button>

              {/* Panel 3 */}
              <button
                type="button"
                onClick={() => {
                  setIsPlayingStory(false);
                  setStoryStep(2);
                }}
                className={`instrument-panel instrument-ticks p-5 text-left flex flex-col justify-between gap-4 transition-all ${
                  storyStep === 2 ? 'border-[var(--ember)] ring-1 ring-[var(--ember)]/40' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--ember)]">STEP 3 · LAYER 3</span>
                    <span className="text-[var(--risk-urgent)]">Where trouble hits</span>
                  </div>

                  {/* Custom SVG: Cattle feed mill + flood waves + alert */}
                  <svg
                    viewBox="0 0 280 150"
                    className="w-full h-36 rounded-xl bg-[var(--ink)]/60 border border-[var(--line)]"
                    aria-hidden="true"
                  >
                    {/* Feed mill silo */}
                    <rect x="34" y="42" width="44" height="68" rx="6" fill="var(--panel)" stroke="var(--ember)" strokeWidth="2" />
                    <path d="M34 52 Q56 30 78 52" fill="var(--ember)" fillOpacity="0.3" stroke="var(--ember)" strokeWidth="2" />
                    <rect x="82" y="64" width="38" height="46" rx="4" fill="var(--panel)" stroke="var(--ember)" strokeWidth="2" />
                    {/* Flood waves */}
                    <path
                      d="M18 112 Q38 102 58 112 T98 112 T138 112"
                      fill="none"
                      stroke="var(--blue)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M22 124 Q42 114 62 124 T102 124 T138 124"
                      fill="none"
                      stroke="var(--blue)"
                      strokeOpacity="0.6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Ripple wave arrow to empty cup */}
                    <path d="M148 82 L186 82" stroke="var(--risk-urgent)" strokeWidth="2.5" />
                    <path d="M180 76 L188 82 L180 88" fill="none" stroke="var(--risk-urgent)" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Alert badge & empty cup */}
                    <circle cx="226" cy="78" r="28" fill="var(--risk-urgent)" fillOpacity="0.14" stroke="var(--risk-urgent)" strokeWidth="2" />
                    <path d="M226 64 L226 80" stroke="var(--risk-urgent)" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="226" cy="90" r="2.5" fill="var(--risk-urgent)" />
                  </svg>
                </div>

                <p className="font-display text-lg font-semibold text-[var(--text)]">
                  The farm needs cattle feed. A flood closes the feed mill. Your milk stops.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* (2) Factory with parts strip */}
        <section className="border-t border-[var(--line)] py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="instrument-panel instrument-ticks p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--blue)]">
                  <Factory className="h-4 w-4" aria-hidden="true" />
                  <span>Same idea for factories</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
                  The exact same chain happens with factory parts
                </h2>
                <p className="text-base text-[var(--muted)] leading-relaxed">
                  You buy plastic covers from a moulder. They buy Nylon-66 resin from a plant in
                  Dahej. If a boiler shuts down there, your assembly line stops in 10 days—unless
                  DeepTier warns you today.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[var(--teal)]">
                    Your factory
                  </span>
                  <span className="text-[var(--muted)]">←</span>
                  <span className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[var(--blue)]">
                    Parts moulder
                  </span>
                  <span className="text-[var(--muted)]">←</span>
                  <span className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[var(--amber)]">
                    Resin plant
                  </span>
                  <span className="text-[var(--muted)]">←</span>
                  <span className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[var(--ember)]">
                    Petrochemical cracker
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onTryFactory}
                className="min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--blue)] bg-[var(--blue)]/15 px-6 py-3 text-sm sm:text-base font-bold text-[var(--text)] hover:bg-[var(--blue)]/25 transition-colors shrink-0"
              >
                <span>Open Factory world</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* (3) Strip of 18 risk icons labelled "Not just floods and fires." */}
        <section className="border-t border-[var(--line)] bg-[var(--navy)]/40 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
                Not just floods and fires.
              </h2>
              <p className="mt-1 text-base text-[var(--muted)]">
                DeepTier watches 18 everyday troubles—from heatwaves and cattle disease to strikes,
                export bans, price jumps, and cyber attacks.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {RISK_TYPE_ITEMS.map((item) => (
                <div
                  key={item.type}
                  className="instrument-panel-raised p-3 flex items-center gap-2.5"
                >
                  <span className="text-[var(--amber)] shrink-0">{HAZARD_ICON[item.type]}</span>
                  <span className="text-xs sm:text-sm font-medium text-[var(--text)] leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* (4) Counter strip */}
        <section className="border-t border-[var(--line)] py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="instrument-panel instrument-ticks p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-3xl sm:text-4xl font-bold text-[var(--teal)] tabular-nums">
                    3
                  </div>
                  <MetricTooltip
                    label="Layers discovered"
                    explanation={t.metricTooltips.landingLayers}
                    align="right"
                  />
                </div>
                <div className="mt-1 font-display text-base font-bold text-[var(--text)]">
                  Layers discovered
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Your suppliers, their suppliers, and their suppliers&apos; suppliers.
                </p>
              </div>

              <div className="instrument-panel instrument-ticks p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-3xl sm:text-4xl font-bold text-[var(--amber)] tabular-nums">
                    8
                  </div>
                  <MetricTooltip
                    label="Languages understood"
                    explanation={t.metricTooltips.landingLanguages}
                    align="right"
                  />
                </div>
                <div className="mt-1 font-display text-base font-bold text-[var(--text)]">
                  Languages understood
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, and English.
                </p>
              </div>

              <div className="instrument-panel instrument-ticks p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-3xl sm:text-4xl font-bold text-[var(--blue)] tabular-nums">
                    18
                  </div>
                  <MetricTooltip
                    label="Risk types watched"
                    explanation={t.metricTooltips.landingRisks}
                    align="right"
                  />
                </div>
                <div className="mt-1 font-display text-base font-bold text-[var(--text)]">
                  Risk types watched
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Weather, strikes, port delays, price jumps, bans, and shutdowns.
                </p>
              </div>

              <div className="instrument-panel instrument-ticks p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-3xl sm:text-4xl font-bold text-[var(--ember)] tabular-nums">
                    6–14
                  </div>
                  <MetricTooltip
                    label="Days of warning gained"
                    explanation={t.metricTooltips.landingHeadStart}
                    align="right"
                  />
                </div>
                <div className="mt-1 font-display text-base font-bold text-[var(--text)]">
                  Days of warning gained
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Extra days to order stock or call a backup supplier before shelves empty.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* (5) Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--navy)] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
            <RingLogo size={20} />
            <span>Team MindMesh, Visionet Techthon 2026</span>
          </div>
          <div>Built for small shops &amp; factories across India</div>
        </div>
      </footer>
    </div>
  );
}
