import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  MessageSquareQuote,
  Play,
  RotateCcw,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { MULTILINGUAL_TEST_SNIPPETS } from '../data/sampleNews';
import {
  VERIFICATION_SCENARIOS,
  type AppRoute,
  type TroubleEvent,
} from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';

interface StoryModeTourProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

interface StoryStepMeta {
  id: string;
  phase: 'Shop Story' | 'Factory Replay' | 'Risk Montage';
  caption: string;
  subcaption: string;
  speakerLine: string;
  targetSelector: string;
}

const SHOP_HEATWAVE_SNIPPET =
  MULTILINGUAL_TEST_SNIPPETS.find((s) => s.id === 'snip-ta-govt-milk') ??
  MULTILINGUAL_TEST_SNIPPETS[1];

const FACTORY_FLOOD_SNIPPET =
  MULTILINGUAL_TEST_SNIPPETS.find((s) => s.id === 'snip-ta-flood') ??
  MULTILINGUAL_TEST_SNIPPETS[0];

const STORY_STEPS: StoryStepMeta[] = [
  {
    id: 'shop-1-meet',
    phase: 'Shop Story',
    caption: 'Meet the tea stall: you know only your milk vendor',
    subcaption:
      'Sri Murugan Tea & Bakery sees its direct milk, sugar, and gas vendors—while layers 2 and 3 sit hidden in the fog.',
    speakerLine:
      'Most small shops only know who drops crates at their gate; upstream farms and mills stay invisible.',
    targetSelector: '[data-spotlight="chain-map-canvas"]',
  },
  {
    id: 'shop-2-layers',
    phase: 'Shop Story',
    caption: 'Show hidden layers: the farm and the feed mill appear',
    subcaption:
      'DeepTier uncovers the chilling co-op in Vellore and the single-source cattle-feed mill in Erode behind your milk supply.',
    speakerLine:
      'One tap sharpens the outer rings so the shop sees its hidden supply links two and three hops upstream.',
    targetSelector: '[data-spotlight="chain-map-canvas"]',
  },
  {
    id: 'shop-3-tamil-news',
    phase: 'Shop Story',
    caption: 'A heatwave news item arrives in Tamil',
    subcaption:
      'Paste or speak a Tamil Dairy Department alert warning of heatwave stress in Vellore and Erode. (You can also tap Speak.)',
    speakerLine:
      'Early warnings rarely start in English spreadsheets—they arrive as local bulletins or voice notes.',
    targetSelector: '[data-spotlight="news-input-card"]',
  },
  {
    id: 'shop-4-pipeline',
    phase: 'Shop Story',
    caption: 'Watch language found, translated, matched',
    subcaption:
      'DeepTier detects Tamil, translates it to simple English, highlights what/where/how bad, and matches it to your milk chain.',
    speakerLine:
      'Six transparent steps turn regional text into verified supplier intelligence and confidence scores.',
    targetSelector: '[data-spotlight="news-pipeline-card"]',
  },
  {
    id: 'shop-5-clock',
    phase: 'Shop Story',
    caption: 'The clock shows milk running out',
    subcaption:
      'Today screen puts the Days-Left Clock front and center so the owner knows exactly how soon stock hits zero.',
    speakerLine:
      'No jargon or abstract indices—just a clear countdown to when shelves run empty.',
    targetSelector: '[data-spotlight="days-left-clock"]',
  },
  {
    id: 'shop-6-ripple',
    phase: 'Shop Story',
    caption: 'Ripple animation',
    subcaption:
      'Like a stone dropped in water, the shock drains feed mill stock, chilling center stock, and travels day by day to the tea stall.',
    speakerLine:
      'Watch each link pause while its stock drains yellow to red before reaching your counter on Day B.',
    targetSelector: '[data-spotlight="ripple-workbench"]',
  },
  {
    id: 'shop-7-order-extra',
    phase: 'Shop Story',
    caption: 'One tap on "Order extra stock" and "You save Rs. ..." appears',
    subcaption:
      'Tap Order extra stock (+5d) below or inside the panel to re-run the engine live and reveal your green savings.',
    speakerLine:
      'Owners can test adding five days of extra milk stock and immediately see how many rupees stay protected.',
    targetSelector: '[data-spotlight="ripple-try-it"]',
  },
  {
    id: 'shop-8-whatsapp',
    phase: 'Shop Story',
    caption: 'Share the alert on WhatsApp',
    subcaption:
      'Send a ready-made short warning to your supplier or staff on WhatsApp with one tap.',
    speakerLine:
      'Insights only help if people act—one tap sends a clear Tamil or English WhatsApp alert.',
    targetSelector: '[data-spotlight="whatsapp-share-btn"]',
  },
  {
    id: 'factory-9-flood',
    phase: 'Factory Replay',
    caption: 'Same idea for a factory: Chennai plant + Thoothukudi flood',
    subcaption:
      'Switching to Kaveri Precision Auto Parts and replaying the 3-week (21-day) Thoothukudi coastal flood across industrial suppliers.',
    speakerLine:
      'The exact same math scales from a neighborhood tea stall to a Chennai precision auto parts factory.',
    targetSelector: '[data-spotlight="ripple-workbench"]',
  },
  {
    id: 'montage-10-price',
    phase: 'Risk Montage',
    caption: 'Quick montage (1/3): Material price spike (+35%) in Shock Test',
    subcaption:
      'Shock Test applies the price formula against Layer-1 monthly spend to size cost impact automatically.',
    speakerLine:
      'Not every shock is a shutdown—a sudden 35% price hike hits working capital just as hard.',
    targetSelector: '[data-spotlight="shock-test-result"]',
  },
  {
    id: 'montage-11-cyber',
    phase: 'Risk Montage',
    caption: 'Quick montage (2/3): Cyber attack on Peenya CNC',
    subcaption:
      'A single-supplier ransomware attack targets only that vendor and marks Urgent if it has no backup.',
    speakerLine:
      'Single-supplier cyber shocks isolate a single critical factory partner without false alarms elsewhere.',
    targetSelector: '[data-spotlight="shock-test-result"]',
  },
  {
    id: 'montage-12-gas',
    phase: 'Risk Montage',
    caption: 'Quick montage (3/3): Gas shortage across suppliers',
    subcaption:
      'Group-wide fuel and industrial gas squeeze simulated in Shock Test with Best / Likely / Worst recovery bounds.',
    speakerLine:
      'From coastal floods to cyber locks and gas bottlenecks, all 18 risk types share one deterministic engine.',
    targetSelector: '[data-spotlight="shock-test-result"]',
  },
];

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function StoryModeTour({ currentRoute, onNavigate }: StoryModeTourProps) {
  const {
    selectDemoWorld,
    setOuterRingsDiscovered,
    sharpenOuterRings,
    triggerStoryNews,
    triggerStoryOrderExtraStock,
    triggerStoryShockPreset,
    clearStoryShockPreset,
    addAlerts,
    setSelectedEventId,
    setJudgesMode,
    resetDemoState,
    loadVerificationScenario,
    activeScenarioId,
    isWorldPickerOpen,
    closeWorldPicker,
  } = useDeepTier();

  const prefersReducedMotion = usePrefersReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [showScenarioSwitcher, setShowScenarioSwitcher] = useState(false);
  const [spotRect, setSpotRect] = useState<RectBox | null>(null);

  const currentStep = STORY_STEPS[stepIdx] ?? STORY_STEPS[0];
  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const applyStepState = useCallback(
    (index: number) => {
      const step = STORY_STEPS[index];
      if (!step) return;

      closeWorldPicker();

      if (index < 9) {
        clearStoryShockPreset();
      }

      switch (step.id) {
        case 'shop-1-meet': {
          selectDemoWorld('shop');
          setOuterRingsDiscovered(false);
          onNavigate('chain-map');
          break;
        }
        case 'shop-2-layers': {
          selectDemoWorld('shop');
          sharpenOuterRings();
          onNavigate('chain-map');
          break;
        }
        case 'shop-3-tamil-news': {
          onNavigate('news-watch');
          window.setTimeout(() => {
            triggerStoryNews({
              text: SHOP_HEATWAVE_SNIPPET.text,
              sourceType: SHOP_HEATWAVE_SNIPPET.sourceType,
              englishHint: SHOP_HEATWAVE_SNIPPET.englishFallback,
              autoAnalyse: false,
            });
          }, 90);
          break;
        }
        case 'shop-4-pipeline': {
          onNavigate('news-watch');
          window.setTimeout(() => {
            triggerStoryNews({
              text: SHOP_HEATWAVE_SNIPPET.text,
              sourceType: SHOP_HEATWAVE_SNIPPET.sourceType,
              englishHint: SHOP_HEATWAVE_SNIPPET.englishFallback,
              autoAnalyse: true,
            });
          }, 90);
          break;
        }
        case 'shop-5-clock': {
          onNavigate('overview');
          break;
        }
        case 'shop-6-ripple': {
          onNavigate('ripple');
          window.setTimeout(() => {
            document
              .getElementById('live-alert-ripple')
              ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
          }, 140);
          break;
        }
        case 'shop-7-order-extra': {
          onNavigate('ripple');
          window.setTimeout(() => {
            document
              .querySelector('[data-spotlight="ripple-try-it"]')
              ?.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
          }, 120);
          break;
        }
        case 'shop-8-whatsapp': {
          onNavigate('overview');
          break;
        }
        case 'factory-9-flood': {
          selectDemoWorld('factory');
          sharpenOuterRings();
          const floodEv: TroubleEvent = {
            id: 'story-factory-tuticorin-flood',
            type: 'flood',
            hazardType: 'flood',
            target: 'Tuticorin',
            region: 'Tuticorin',
            lat: 8.7642,
            lng: 78.1348,
            severity: 0.9,
            durationDays: 21,
            expectedDurationDays: 21,
            confidence: 0.92,
            sourceKind: 'news',
            sourceType: 'local_news',
            sourceName: 'Thoothukudi Coastal Bulletin',
            verifiedStatus: 'verified',
            language: 'ta',
            sourceText: FACTORY_FLOOD_SNIPPET.text,
            rawText: FACTORY_FLOOD_SNIPPET.text,
            translation: FACTORY_FLOOD_SNIPPET.englishFallback,
            plainSummary: FACTORY_FLOOD_SNIPPET.englishFallback,
            title: 'Thoothukudi port & industrial corridor flooded for 3 weeks',
            affectedKeywords: ['port', 'tuticorin', 'thoothukudi', 'flood'],
            publishedAt: new Date().toISOString(),
            readerMode: 'offline-rule',
          };
          addAlerts([floodEv]);
          setSelectedEventId(floodEv.id);
          onNavigate('ripple');
          window.setTimeout(() => {
            document
              .getElementById('live-alert-ripple')
              ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
          }, 150);
          break;
        }
        case 'montage-10-price': {
          selectDemoWorld('factory');
          sharpenOuterRings();
          onNavigate('ripple');
          window.setTimeout(() => {
            triggerStoryShockPreset({
              type: 'material_price_spike',
              target: 'packaging',
              severity: 0.7,
              durationDays: 20,
              pricePct: 0.35,
              autoRun: true,
            });
          }, 100);
          break;
        }
        case 'montage-11-cyber': {
          onNavigate('ripple');
          window.setTimeout(() => {
            triggerStoryShockPreset({
              type: 'cyber_attack',
              target: 'fac-l1-cnc',
              severity: 1.0,
              durationDays: 10,
              autoRun: true,
            });
          }, 100);
          break;
        }
        case 'montage-12-gas': {
          onNavigate('ripple');
          window.setTimeout(() => {
            triggerStoryShockPreset({
              type: 'gas_shortage',
              target: 'gas',
              severity: 0.85,
              durationDays: 14,
              autoRun: true,
            });
          }, 100);
          break;
        }
        default:
          break;
      }
    },
    [
      addAlerts,
      clearStoryShockPreset,
      closeWorldPicker,
      onNavigate,
      scrollBehavior,
      selectDemoWorld,
      setOuterRingsDiscovered,
      setSelectedEventId,
      sharpenOuterRings,
      triggerStoryNews,
      triggerStoryShockPreset,
    ],
  );

  const startStory = () => {
    setIsOpen(true);
    setStepIdx(0);
    setShowScenarioSwitcher(false);
    applyStepState(0);
  };

  const goToStep = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(STORY_STEPS.length - 1, nextIndex));
      setStepIdx(clamped);
      applyStepState(clamped);
    },
    [applyStepState],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSpotRect(null);
    clearStoryShockPreset();
  }, [clearStoryShockPreset]);

  const handleReset = () => {
    resetDemoState();
    setStepIdx(0);
    setShowScenarioSwitcher(false);
    applyStepState(0);
  };

  const handleJumpForJudges = () => {
    setJudgesMode(true);
    setIsOpen(false);
    setSpotRect(null);
    clearStoryShockPreset();
    if (currentRoute === 'landing' || isWorldPickerOpen) {
      closeWorldPicker();
      onNavigate('overview');
    }
    window.setTimeout(() => {
      document
        .getElementById('judges-panel')
        ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    }, 120);
  };

  // Keyboard arrows: Left / Right / Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToStep(stepIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToStep(stepIdx - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToStep, handleClose, isOpen, stepIdx]);

  // Measure target element rect for the spotlight cutout
  useEffect(() => {
    if (!isOpen) {
      setSpotRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (!el) {
        setSpotRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setSpotRect(null);
        return;
      }
      const pad = 8;
      const top = Math.max(8, r.top - pad);
      const left = Math.max(8, r.left - pad);
      const maxH = Math.min(r.height + pad * 2, window.innerHeight - 180);
      const width = Math.min(r.width + pad * 2, window.innerWidth - left - 8);
      setSpotRect({
        top,
        left,
        width: Math.max(40, width),
        height: Math.max(44, maxH),
      });
    };

    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
      }
      measure();
    }, 180);

    const interval = window.setInterval(measure, 280);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [currentRoute, currentStep.targetSelector, isOpen, scrollBehavior, stepIdx]);

  return (
    <>
      {/* Floating "Story Mode" Launch Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={startStory}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 min-h-[48px] inline-flex items-center gap-2 rounded-full bg-[var(--amber)] px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] shadow-lg hover:brightness-105 active:scale-[0.98] transition-transform"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Story Mode</span>
        </button>
      )}

      {/* Spotlight Backdrop & Highlight Frame */}
      {isOpen && (
        <div className="fixed inset-0 z-[55] pointer-events-none">
          {spotRect ? (
            <div
              aria-hidden="true"
              className="fixed rounded-2xl border-2 border-[var(--amber)] transition-all duration-300 ease-out"
              style={{
                top: spotRect.top,
                left: spotRect.left,
                width: spotRect.width,
                height: spotRect.height,
                boxShadow: '0 0 0 9999px rgba(4, 12, 22, 0.72)',
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="fixed inset-0 bg-black/70 transition-opacity"
            />
          )}
        </div>
      )}

      {/* Story Mode Director Card */}
      {isOpen && (
        <aside
          aria-label="Story Mode Guided Tour"
          className="fixed bottom-20 left-3 right-3 md:bottom-5 md:left-auto md:right-5 md:w-[540px] max-w-[calc(100vw-24px)] max-h-[75vh] overflow-y-auto z-[60] instrument-panel instrument-ticks border-[var(--amber)]/70 p-4 sm:p-5 shadow-2xl space-y-3.5"
        >
          {/* Top row: Phase badge, step progress, utility jumps */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[var(--amber)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--amber-ink)]">
                {stepIdx + 1}/{STORY_STEPS.length}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--amber)]">
                {currentStep.phase}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSpeakerNotes((v) => !v)}
                aria-pressed={showSpeakerNotes}
                className={`min-h-[44px] inline-flex items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                  showSpeakerNotes
                    ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Speaker notes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScenarioSwitcher((v) => !v)}
                aria-pressed={showScenarioSwitcher}
                className={`min-h-[44px] inline-flex items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                  showScenarioSwitcher
                    ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)]'
                    : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                <span>8 Tests</span>
              </button>

              <button
                type="button"
                onClick={handleJumpForJudges}
                className="min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--navy)] px-2.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--amber)]"
              >
                <Scale className="h-3.5 w-3.5 text-[var(--amber)]" aria-hidden="true" />
                <span>For judges</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset tour to Step 1"
                className="min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--navy)] px-2.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Exit Story Mode"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Caption & Subcaption */}
          <div className="space-y-1">
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text)] leading-snug">
              {currentStep.caption}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              {currentStep.subcaption}
            </p>
          </div>

          {/* Step 7 Live One-Tap "Order extra stock" Action inside Story Card */}
          {currentStep.id === 'shop-7-order-extra' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--teal)]/45 bg-[var(--teal)]/12 px-3.5 py-2.5">
              <span className="text-xs font-semibold text-[var(--text)]">
                Try the decision right here:
              </span>
              <button
                type="button"
                onClick={() => triggerStoryOrderExtraStock(5)}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[var(--teal)] px-4 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105 shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Order extra stock (+5d)</span>
              </button>
            </div>
          )}

          {/* Speaker Notes Strip (1 line per step) */}
          {showSpeakerNotes && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-xs text-[var(--text)]">
              <span className="font-bold text-[var(--teal)] mr-1.5">Talk track:</span>
              {currentStep.speakerLine}
            </div>
          )}

          {/* Scenario Switcher for the 8 Part-5 Tests */}
          {showScenarioSwitcher && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3 space-y-2 max-h-[180px] overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--amber)]">
                Load any of the 8 engine tests live
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {VERIFICATION_SCENARIOS.map((spec) => {
                  const active = activeScenarioId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => {
                        clearStoryShockPreset();
                        loadVerificationScenario(spec.id);
                        setJudgesMode(true);
                        onNavigate('ripple');
                        window.setTimeout(() => {
                          document
                            .getElementById('live-alert-ripple')
                            ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
                        }, 120);
                      }}
                      className={`min-h-[44px] rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                        active
                          ? 'border-[var(--amber)] bg-[var(--amber)]/20 text-[var(--text)]'
                          : 'border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]'
                      }`}
                    >
                      <div className="truncate">{spec.shortLabel}</div>
                      <div className="font-mono text-[10px] text-[var(--muted)] truncate">
                        {spec.expectedSummary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Controls: Step Dots + Back / Next + Arrow Key Hint */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
            <div className="flex flex-wrap items-center" aria-label="Story progress">
              {STORY_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(idx)}
                  aria-label={`Go to step ${idx + 1}: ${s.caption}`}
                  className="inline-flex min-h-[44px] items-center justify-center px-1"
                >
                  <span
                    className={`h-2 rounded-full transition-all ${
                      idx === stepIdx
                        ? 'w-5 bg-[var(--amber)]'
                        : idx < stepIdx
                          ? 'w-2 bg-[var(--teal)]'
                          : 'w-2 bg-[var(--line)]'
                    }`}
                  />
                </button>
              ))}
              <span className="hidden sm:inline ml-2 text-[10px] font-mono text-[var(--muted)]">
                ← / → keys
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={stepIdx === 0}
                onClick={() => goToStep(stepIdx - 1)}
                className="min-h-[44px] inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </button>

              {stepIdx < STORY_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep(stepIdx + 1)}
                  className="min-h-[44px] inline-flex items-center gap-1 rounded-xl bg-[var(--amber)] px-4 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] inline-flex items-center gap-1 rounded-xl bg-[var(--teal)] px-4 text-xs font-bold text-[var(--amber-ink)] hover:brightness-105"
                >
                  <span>Finish tour</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
