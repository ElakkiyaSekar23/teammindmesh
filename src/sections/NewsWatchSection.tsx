import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  Mic,
  MicOff,
  Newspaper,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MULTILINGUAL_TEST_SNIPPETS, type QuickTestSnippet } from '../data/sampleNews';
import {
  formatInr,
  simulateEventRipple,
  type AppRoute,
  type NewsLanguage,
  type RippleImpact,
  type SourceType,
  type TroubleEvent,
} from '../engine';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';
import { useDeepTier } from '../state/store';
import { LanguageChip } from '../components/LanguageChip';
import { LiveWorldBanner } from '../components/LiveWorldBanner';
import { MetricTooltip } from '../components/MetricTooltip';
import { RingEmptyState, RingLoader, TrafficLightTag } from '../components/RingMotif';
import { getRiskTypeLabel, RiskTypeIcon } from '../components/RiskTypeIcon';
import { WhatsAppAlertBubble } from '../components/WhatsAppAlertBubble';

interface NewsWatchSectionProps {
  onNavigate: (route: AppRoute) => void;
}

type InputChoice = 'type' | 'speak' | 'sample';
type SpeechLang = 'en-IN' | 'ta-IN' | 'hi-IN';

const PIPELINE_STEPS = [
  'Received',
  'Language found',
  'Translated',
  'Trouble spotted',
  'Matched to your suppliers',
  'Your risk',
] as const;

const VOICE_LANG_CODE: Record<NewsLanguage, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
};

interface AnalyzedCardData {
  id: string;
  originalText: string;
  language: NewsLanguage;
  languageDisplay: string;
  translation: string;
  sourceKind: TroubleEvent['sourceKind'];
  readerMode: TroubleEvent['readerMode'];
  fallbackReason?: string;
  events: TroubleEvent[];
  evidences: string[];
  noRelevantTrouble: boolean;
  impacts: RippleImpact[];
  sampleMeta?: QuickTestSnippet;
}

function getTrustBadgeInfo(sourceKind: TroubleEvent['sourceKind']) {
  if (sourceKind === 'govt alert') {
    return {
      label: 'Official notice',
      className: 'border-[var(--teal)]/40 bg-[var(--teal)]/12 text-[var(--teal)]',
      icon: 'official' as const,
    };
  }
  if (sourceKind === 'forward') {
    return {
      label: 'Unverified forward',
      className:
        'border-[var(--risk-watch)]/50 bg-[var(--risk-watch)]/12 text-[var(--risk-watch)]',
      icon: 'forward' as const,
    };
  }
  return {
    label: 'News',
    className: 'border-[var(--blue)]/40 bg-[var(--blue)]/12 text-[var(--blue)]',
    icon: 'news' as const,
  };
}

function severityWord(sev: number): string {
  if (sev >= 0.9) return 'Extreme';
  if (sev >= 0.75) return 'Severe';
  if (sev >= 0.55) return 'Serious';
  if (sev >= 0.35) return 'Moderate';
  return 'Minor';
}

interface HighlightSpan {
  term: string;
  role: 'what' | 'where' | 'howBad';
}

/**
 * Safely splits text by key terms (what / where / how bad) without raw HTML injection.
 */
function renderHighlightedText(text: string, spans: HighlightSpan[]): React.ReactNode {
  const validSpans = spans
    .map((s) => ({ ...s, term: s.term.trim() }))
    .filter((s) => s.term.length >= 2)
    .sort((a, b) => b.term.length - a.term.length);

  if (!text || validSpans.length === 0) return text;

  const escapedTerms = validSpans.map((s) =>
    s.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const match = validSpans.find((s) => s.term.toLowerCase() === part.toLowerCase());
    if (!match) return <React.Fragment key={idx}>{part}</React.Fragment>;

    const tone =
      match.role === 'what'
        ? 'bg-[var(--amber)]/22 text-[var(--amber)] border-b border-[var(--amber)]'
        : match.role === 'where'
          ? 'bg-[var(--blue)]/22 text-[var(--blue)] border-b border-[var(--blue)]'
          : 'bg-[var(--ember)]/22 text-[var(--ember)] border-b border-[var(--ember)]';

    return (
      <mark key={idx} className={`rounded px-1 py-0.5 font-semibold ${tone}`}>
        {part}
      </mark>
    );
  });
}

export function NewsWatchSection({ onNavigate }: NewsWatchSectionProps) {
  const {
    events,
    riskSummary,
    graph,
    analyzeNewsDraft,
    addAlerts,
    setSelectedEventId,
    storyNewsDraft,
    t,
  } = useDeepTier();

  const prefersReducedMotion = usePrefersReducedMotion();

  const [inputMode, setInputMode] = useState<InputChoice>('sample');
  const [speechLang, setSpeechLang] = useState<SpeechLang>('ta-IN');
  const [text, setText] = useState<string>(MULTILINGUAL_TEST_SNIPPETS[0].text);
  const [sourceType, setSourceType] = useState<SourceType>(
    MULTILINGUAL_TEST_SNIPPETS[0].sourceType,
  );
  const [activeSample, setActiveSample] = useState<QuickTestSnippet | null>(
    MULTILINGUAL_TEST_SNIPPETS[0],
  );

  const [isListening, setIsListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isAnalysingAll, setIsAnalysingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [pipelineStage, setPipelineStage] = useState<number>(0); // 0 = idle, 1..6 active/done

  const [currentResult, setCurrentResult] = useState<AnalyzedCardData | null>(null);
  const [batchResults, setBatchResults] = useState<AnalyzedCardData[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastHandledStoryNonceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!storyNewsDraft || lastHandledStoryNonceRef.current === storyNewsDraft.nonce) {
      return;
    }
    lastHandledStoryNonceRef.current = storyNewsDraft.nonce;

    setInputMode('type');
    setText(storyNewsDraft.text);
    setSourceType(storyNewsDraft.sourceType);
    const matchingSample = MULTILINGUAL_TEST_SNIPPETS.find(
      (s) => s.text.trim() === storyNewsDraft.text.trim(),
    );
    setActiveSample(matchingSample ?? null);

    if (!storyNewsDraft.autoAnalyse) {
      setPipelineStage(0);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsAnalysing(true);
      setPipelineStage(1);
      try {
        const [res] = await Promise.all([
          analyzeNewsDraft({
            text: storyNewsDraft.text,
            sourceType: storyNewsDraft.sourceType,
            englishFallbackHint: storyNewsDraft.englishHint,
          }),
          (async () => {
            if (prefersReducedMotion) {
              setPipelineStage(5);
              return;
            }
            for (let s = 1; s <= 5; s++) {
              if (cancelled) return;
              setPipelineStage(s);
              await new Promise((r) => window.setTimeout(r, 95));
            }
          })(),
        ]);
        if (cancelled) return;
        setPipelineStage(6);
        const impacts = res.events.flatMap((ev) => simulateEventRipple(graph, ev));
        const card: AnalyzedCardData = {
          id: `story-${Date.now()}`,
          originalText: storyNewsDraft.text,
          language: res.language,
          languageDisplay: res.languageDisplay,
          translation: res.translation,
          sourceKind: res.sourceKind,
          readerMode: res.readerMode,
          fallbackReason: res.fallbackReason,
          events: res.events,
          evidences: res.evidences,
          noRelevantTrouble: res.noRelevantTrouble,
          impacts,
          sampleMeta: matchingSample,
        };
        setCurrentResult(card);
        if (res.events.length > 0) {
          addAlerts(res.events);
          setAddedIds((prev) => ({ ...prev, [card.id]: true }));
        }
      } finally {
        if (!cancelled) setIsAnalysing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addAlerts, analyzeNewsDraft, graph, storyNewsDraft]);

  const selectInputMode = (mode: InputChoice) => {
    setInputMode(mode);
    setVoiceNote(null);
    if (mode === 'type') {
      window.setTimeout(() => textareaRef.current?.focus(), 60);
    }
  };

  const handleVoiceInput = (chosenLang?: SpeechLang) => {
    const langToUse = chosenLang ?? speechLang;
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNote(t.ui.voiceNotSupported);
      return;
    }

    setVoiceNote(null);
    const recognition = new SpeechRec() as {
      lang: string;
      interimResults: boolean;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    };
    recognition.lang = langToUse;
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setText(transcript);
        setActiveSample(null);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceNote('Could not capture voice cleanly. Try again or paste text.');
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const handleReadAloudOriginal = (
    cardId: string,
    originalText: string,
    lang: NewsLanguage,
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNote(t.ui.ttsNotSupported);
      return;
    }
    if (speakingCardId === cardId) {
      window.speechSynthesis.cancel();
      setSpeakingCardId(null);
      return;
    }
    setVoiceNote(null);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(originalText);
    utterance.lang = VOICE_LANG_CODE[lang] ?? 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingCardId(null);
    utterance.onerror = () => setSpeakingCardId(null);
    setSpeakingCardId(cardId);
    window.speechSynthesis.speak(utterance);
  };

  const animatePipeline = async () => {
    if (prefersReducedMotion) {
      setPipelineStage(5);
      return;
    }
    for (let s = 1; s <= 5; s++) {
      setPipelineStage(s);
      await new Promise((r) => window.setTimeout(r, 110));
    }
  };

  const buildAnalyzedCard = (
    id: string,
    originalText: string,
    data: Awaited<ReturnType<typeof analyzeNewsDraft>>,
    sampleMeta?: QuickTestSnippet,
  ): AnalyzedCardData => {
    const impacts = data.events.flatMap((ev) => simulateEventRipple(graph, ev));
    return {
      id,
      originalText,
      language: data.language,
      languageDisplay: data.languageDisplay,
      translation: data.translation,
      sourceKind: data.sourceKind,
      readerMode: data.readerMode,
      fallbackReason: data.fallbackReason,
      events: data.events,
      evidences: data.evidences,
      noRelevantTrouble: data.noRelevantTrouble,
      impacts,
      sampleMeta,
    };
  };

  const handleAnalyseSingle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (isAnalysing || isAnalysingAll) return;
    if (!clean) {
      setFormError(t.ui.enterMessageFirst);
      textareaRef.current?.focus();
      return;
    }
    setFormError(null);

    setIsAnalysing(true);
    setPipelineStage(1);
    const matchingSample =
      activeSample && activeSample.text.trim() === clean
        ? activeSample
        : MULTILINGUAL_TEST_SNIPPETS.find((s) => s.text.trim() === clean);

    try {
      const [res] = await Promise.all([
        analyzeNewsDraft({
          text: clean,
          sourceType,
          englishFallbackHint: matchingSample?.englishFallback,
        }),
        animatePipeline(),
      ]);

      setPipelineStage(6);
      const card = buildAnalyzedCard(
        `analyzed-${Date.now()}`,
        clean,
        res,
        matchingSample,
      );
      setCurrentResult(card);
    } catch {
      setFormError(t.ui.mapLoadError);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleAnalyseAll = async () => {
    if (isAnalysing || isAnalysingAll) return;
    setIsAnalysingAll(true);
    setBatchResults([]);
    setBatchProgress({ done: 0, total: MULTILINGUAL_TEST_SNIPPETS.length });
    setPipelineStage(1);

    const collected: AnalyzedCardData[] = [];
    try {
      for (let i = 0; i < MULTILINGUAL_TEST_SNIPPETS.length; i++) {
        const snip = MULTILINGUAL_TEST_SNIPPETS[i];
        setPipelineStage(Math.min(6, Math.max(2, Math.floor((i / 12) * 5) + 2)));
        const res = await analyzeNewsDraft({
          text: snip.text,
          sourceType: snip.sourceType,
          englishFallbackHint: snip.englishFallback,
        });
        const card = buildAnalyzedCard(`batch-${snip.id}`, snip.text, res, snip);
        collected.push(card);
        setBatchResults([...collected]);
        setBatchProgress({ done: i + 1, total: MULTILINGUAL_TEST_SNIPPETS.length });
      }
      setPipelineStage(6);
    } finally {
      setIsAnalysingAll(false);
    }
  };

  const handleAddCardToAlerts = (card: AnalyzedCardData) => {
    if (card.events.length === 0) return;
    addAlerts(card.events);
    setAddedIds((prev) => ({ ...prev, [card.id]: true }));
  };

  const buildHighlights = (card: AnalyzedCardData): {
    originalSpans: HighlightSpan[];
    englishSpans: HighlightSpan[];
    whatWords: string[];
    whereWords: string[];
    howBadWords: string[];
  } => {
    const primary = card.events[0];
    const whatWords: string[] = [];
    const whereWords: string[] = [];
    const howBadWords: string[] = [];

    if (primary) {
      whatWords.push(getRiskTypeLabel(primary.type));
      whatWords.push(primary.type.replace(/_/g, ' '));
      whereWords.push(primary.region);
      if (primary.target && primary.target !== primary.region) {
        whereWords.push(primary.target);
      }
      if (primary.pricePct) {
        howBadWords.push(`${Math.round(primary.pricePct * 100)}%`);
      }
      if (primary.durationDays) {
        howBadWords.push(`${primary.durationDays} days`);
        if (primary.durationDays === 21) {
          howBadWords.push('three weeks', 'மூன்று வாரம்');
        }
      }
      howBadWords.push(severityWord(primary.severity));
    }

    const evidenceSpans: HighlightSpan[] = card.evidences.map((ev) => ({
      term: ev,
      role: 'what',
    }));

    const originalSpans: HighlightSpan[] = [
      ...evidenceSpans,
      ...whereWords.map((w) => ({ term: w, role: 'where' as const })),
      ...howBadWords.map((w) => ({ term: w, role: 'howBad' as const })),
    ];

    const englishSpans: HighlightSpan[] = [
      ...whatWords.map((w) => ({ term: w, role: 'what' as const })),
      ...whereWords.map((w) => ({ term: w, role: 'where' as const })),
      ...howBadWords.map((w) => ({ term: w, role: 'howBad' as const })),
      ...evidenceSpans,
    ];

    return {
      originalSpans,
      englishSpans,
      whatWords: Array.from(new Set(whatWords)),
      whereWords: Array.from(new Set(whereWords)),
      howBadWords: Array.from(new Set(howBadWords)),
    };
  };

  const renderAnalyzedCard = (card: AnalyzedCardData, compact = false) => {
    const trust = getTrustBadgeInfo(card.sourceKind);
    const primary = card.events[0];
    const topImpact = card.impacts[0];
    const confidencePct = Math.round((primary?.confidence ?? 0.5) * 100);
    const isAdded = Boolean(addedIds[card.id]);
    const isSpeaking = speakingCardId === card.id;
    const hl = buildHighlights(card);

    return (
      <article
        key={card.id}
        className="instrument-panel instrument-ticks p-4 sm:p-5 space-y-4"
      >
        {/* Top bar: Language, Trust Check badge, Reader badge, Confidence bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <LanguageChip code={card.language} labelOverride={card.languageDisplay} />

            {/* Trust check badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${trust.className}`}
            >
              {trust.icon === 'official' ? (
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ) : trust.icon === 'forward' ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Trust check: {trust.label}</span>
            </span>

            {primary && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                <RiskTypeIcon type={primary.type} className="h-3.5 w-3.5 text-[var(--amber)]" />
                <span>{getRiskTypeLabel(primary.type)}</span>
              </span>
            )}
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
              <span>{t.ui.confidenceLabel}</span>
              <MetricTooltip
                label={t.ui.confidenceLabel}
                explanation={t.metricTooltips.confidence}
                align="right"
              />
            </span>
            <div className="h-2.5 w-20 sm:w-24 rounded-full bg-[var(--panel)] border border-[var(--line)] overflow-hidden shrink-0">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${confidencePct}%`,
                  backgroundColor:
                    confidencePct >= 75
                      ? 'var(--teal)'
                      : confidencePct >= 50
                        ? 'var(--amber)'
                        : 'var(--risk-watch)',
                }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-[var(--text)] tabular-nums">
              {confidencePct}%
            </span>
          </div>
        </div>

        {/* Reader mode / Offline fallback notice */}
        {card.fallbackReason && (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--text)]">{t.controls.offlineReaderBadge}: </span>
            {t.ui.offlineFallbackNotice}
          </div>
        )}

        {/* Original and English Side by Side */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <span>Original ({card.languageDisplay})</span>
              <button
                type="button"
                onClick={() => handleReadAloudOriginal(card.id, card.originalText, card.language)}
                className="min-h-[44px] -my-2 inline-flex items-center gap-1 rounded-lg px-2 text-[var(--teal)] hover:underline normal-case tracking-normal"
              >
                {isSpeaking ? (
                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{isSpeaking ? t.controls.stopListening : t.controls.listenAloud}</span>
              </button>
            </div>
            <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed">
              {renderHighlightedText(card.originalText, hl.originalSpans)}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--amber)]">
              Simple English
            </div>
            <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed">
              {renderHighlightedText(card.translation, hl.englishSpans)}
            </p>
          </div>
        </div>

        {/* Key words strip (What / Where / How bad) */}
        {primary && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--muted)]">Key words:</span>
            <span className="rounded-md border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-2 py-0.5 text-[var(--amber)] font-semibold">
              What: {getRiskTypeLabel(primary.type)}
            </span>
            <span className="rounded-md border border-[var(--blue)]/40 bg-[var(--blue)]/10 px-2 py-0.5 text-[var(--blue)] font-semibold">
              Where: {primary.region}
              {primary.target !== primary.region ? ` (${primary.target})` : ''}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--ember)]/40 bg-[var(--ember)]/10 px-2 py-0.5 text-[var(--ember)] font-semibold">
              <span>
                How bad: {severityWord(primary.severity)} ·{' '}
                {primary.pricePct
                  ? `+${Math.round(primary.pricePct * 100)}% price`
                  : `${primary.durationDays} days`}
              </span>
              <MetricTooltip
                label={t.ui.severityLabel}
                explanation={t.metricTooltips.severity}
              />
            </span>
          </div>
        )}

        {/* Matched Suppliers & Risk Output */}
        {card.noRelevantTrouble ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3.5 space-y-1">
            <div className="text-sm font-semibold text-[var(--text)]">
              {t.ui.noRelevantTroubleTitle}
            </div>
            <p className="text-xs text-[var(--muted)]">{t.ui.noRelevantTroubleDesc}</p>
          </div>
        ) : topImpact ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <TrafficLightTag level={topImpact.alertLevel} />
                <span className="text-sm font-bold text-[var(--text)]">
                  {topImpact.sourceSupplierName} (Layer {topImpact.sourceLayer})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                {topImpact.daysToImpact} {t.controls.daysUntilHurtsLabel} ·{' '}
                <span className="font-mono text-[var(--ember)] font-semibold">
                  {formatInr(topImpact.costAtRiskInr)}
                </span>{' '}
                at risk · {topImpact.recommendedAction}
              </p>
            </div>
            {!compact && (
              <button
                type="button"
                onClick={() => handleAddCardToAlerts(card)}
                disabled={isAdded}
                className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-bold shrink-0 ${
                  isAdded
                    ? 'border border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                    : 'bg-[var(--amber)] text-[var(--amber-ink)] hover:brightness-105'
                }`}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{t.ui.addedToAlerts}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{t.ui.addToMyAlerts}</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs sm:text-sm text-[var(--muted)]">
              Does not touch {graph.business.businessName}&apos;s current mapped suppliers, but
              you can still save this warning.
            </span>
            {!compact && primary && (
              <button
                type="button"
                onClick={() => handleAddCardToAlerts(card)}
                disabled={isAdded}
                className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold shrink-0 ${
                  isAdded
                    ? 'border-[var(--teal)] text-[var(--teal)]'
                    : 'border-[var(--line)] text-[var(--text)] hover:border-[var(--amber)]'
                }`}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isAdded ? 'Added' : t.ui.addToMyAlerts}</span>
              </button>
            )}
          </div>
        )}

        {compact && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleReadAloudOriginal(card.id, card.originalText, card.language)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--teal)]"
            >
              {isSpeaking ? (
                <VolumeX className="h-3.5 w-3.5 text-[var(--ember)]" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-[var(--teal)]" aria-hidden="true" />
              )}
              <span>{isSpeaking ? t.controls.stopListening : t.controls.listenAloud}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddCardToAlerts(card)}
              disabled={isAdded || card.events.length === 0}
              className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-4 text-xs font-bold ${
                isAdded
                  ? 'border border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                  : 'bg-[var(--amber)] text-[var(--amber-ink)] hover:brightness-105 disabled:opacity-40'
              }`}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.ui.addedToAlerts}</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.ui.addToMyAlerts}</span>
                </>
              )}
            </button>
          </div>
        )}
      </article>
    );
  };

  const sampleLanguageCounts = useMemo(
    () => `${MULTILINGUAL_TEST_SNIPPETS.length} samples in 8 languages`,
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {t.sections.newsWatchHeading}
          </h1>
          <p className="mt-1 text-base text-[var(--muted)] max-w-2xl">
            {t.sections.newsWatchSub}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyseAll}
          disabled={isAnalysing || isAnalysingAll}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--amber)] bg-[var(--amber)]/15 px-5 py-2.5 text-sm font-bold text-[var(--amber)] hover:bg-[var(--amber)]/25 disabled:opacity-50 shrink-0"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span>
            {isAnalysingAll && batchProgress
              ? `Analysing ${batchProgress.done}/${batchProgress.total}...`
              : 'Analyse all (12 samples)'}
          </span>
        </button>
      </div>

      {/* Live Real-World Search Watch */}
      <LiveWorldBanner />

      {/* Three Big Input Choices */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => selectInputMode('type')}
          aria-pressed={inputMode === 'type'}
          className={`min-h-[64px] rounded-2xl border p-4 text-left flex items-center gap-3.5 transition-colors ${
            inputMode === 'type'
              ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
              : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--amber)]">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-[var(--text)]">
              Type or paste
            </div>
            <div className="text-xs text-[var(--muted)]">
              News, mandi board, or WhatsApp text
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => selectInputMode('speak')}
          aria-pressed={inputMode === 'speak'}
          className={`min-h-[64px] rounded-2xl border p-4 text-left flex items-center gap-3.5 transition-colors ${
            inputMode === 'speak'
              ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
              : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--teal)]">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-[var(--text)]">Speak</div>
            <div className="text-xs text-[var(--muted)]">
              English, Tamil, or Hindi voice input
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => selectInputMode('sample')}
          aria-pressed={inputMode === 'sample'}
          className={`min-h-[64px] rounded-2xl border p-4 text-left flex items-center gap-3.5 transition-colors ${
            inputMode === 'sample'
              ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--text)]'
              : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--blue)]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-[var(--text)]">
              Use a sample
            </div>
            <div className="text-xs text-[var(--muted)]">{sampleLanguageCounts}</div>
          </div>
        </button>
      </div>

      {/* Main Input Workbench */}
      <div
        data-spotlight="news-input-card"
        className="instrument-panel instrument-ticks p-5 space-y-4"
      >
        {/* Speak Mode Selector */}
        {inputMode === 'speak' && (
          <div className="instrument-panel-raised p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-[var(--text)]">
                Pick microphone language & speak
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    { code: 'en-IN', label: 'English' },
                    { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
                    { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
                  ] as const
                ).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSpeechLang(item.code)}
                      aria-pressed={speechLang === item.code}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs sm:text-sm font-semibold ${
                        speechLang === item.code
                          ? 'border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]'
                          : 'border-[var(--line)] bg-[var(--navy)] text-[var(--muted)]'
                      }`}
                    >
                      {item.label}
                    </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleVoiceInput(speechLang)}
              className={`min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shrink-0 ${
                isListening
                  ? 'bg-[var(--risk-urgent)] text-white'
                  : 'bg-[var(--teal)] text-[var(--amber-ink)]'
              }`}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isListening ? 'Listening now...' : 'Start microphone'}</span>
            </button>
          </div>
        )}

        {/* 12 Native-Script Sample Picker */}
        {inputMode === 'sample' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[var(--muted)]">
                Tap any of the 12 native-script reports, official notices, or forwards:
              </div>
              <span className="font-mono text-xs text-[var(--muted)]">
                3 Tamil · 2 Hindi · 2 English · Te · Kn · Ml · Bn · Mr
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MULTILINGUAL_TEST_SNIPPETS.map((snip) => {
                const isSelected = activeSample?.id === snip.id;
                const badgeColor =
                  snip.sourceType === 'whatsapp_forward'
                    ? 'text-[var(--risk-watch)]'
                    : snip.sourceType === 'official_bulletin'
                      ? 'text-[var(--teal)]'
                      : 'text-[var(--blue)]';
                return (
                  <button
                    key={snip.id}
                    type="button"
                    onClick={() => {
                      setText(snip.text);
                      setSourceType(snip.sourceType);
                      setActiveSample(snip);
                    }}
                    aria-pressed={isSelected}
                    className={`rounded-xl border p-3 text-left transition-colors space-y-1.5 ${
                      isSelected
                        ? 'border-[var(--amber)] bg-[var(--amber)]/12'
                        : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--amber)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[var(--text)]">
                        {snip.languageLabel}
                      </span>
                      <span className={`font-semibold truncate ${badgeColor}`}>
                        {snip.riskTag}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                      {snip.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Textarea + Action Controls */}
        <form onSubmit={handleAnalyseSingle} className="space-y-3">
          <textarea
            ref={textareaRef}
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (formError && e.target.value.trim()) {
                setFormError(null);
              }
              if (activeSample && e.target.value !== activeSample.text) {
                setActiveSample(null);
              }
            }}
            placeholder={t.sections.newsPlaceholder}
            aria-label={t.sections.newsWatchHeading}
            aria-invalid={Boolean(formError)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--amber)] focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="news-source-select" className="sr-only">
                News source type
              </label>
              <select
                id="news-source-select"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="deeptier-select min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm text-[var(--text)]"
              >
                <option value="local_news">News report</option>
                <option value="official_bulletin">Official notice</option>
                <option value="mandi_notice">Mandi / Trade board</option>
                <option value="whatsapp_forward">WhatsApp forward</option>
              </select>

              <button
                type="button"
                disabled={!text.trim()}
                onClick={() =>
                  handleReadAloudOriginal(
                    'draft-preview',
                    text,
                    activeSample?.languageCode ??
                      (speechLang === 'ta-IN'
                        ? 'ta'
                        : speechLang === 'hi-IN'
                          ? 'hi'
                          : 'en'),
                  )
                }
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-sm font-medium text-[var(--text)] hover:border-[var(--teal)] disabled:opacity-40"
              >
                {speakingCardId === 'draft-preview' ? (
                  <VolumeX className="h-4 w-4 text-[var(--ember)]" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[var(--teal)]" aria-hidden="true" />
                )}
                <span>
                  {speakingCardId === 'draft-preview' ? t.controls.stopListening : t.controls.listenAloud}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAnalysing ? (
                <RingLoader label={t.ui.readingNews} />
              ) : (
                <button
                  type="submit"
                  disabled={isAnalysingAll}
                  className="min-h-[48px] inline-flex items-center gap-2 rounded-xl bg-[var(--amber)] px-6 text-sm sm:text-base font-bold text-[var(--amber-ink)] hover:brightness-105 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{t.ui.analyseButton}</span>
                </button>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-[var(--ember)]">
              {formError}
            </p>
          )}
          {voiceNote && (
            <p role="status" className="text-xs font-medium text-[var(--risk-watch)]">
              {voiceNote}
            </p>
          )}
        </form>

      </div>

      {/* 6-Stage Animated Pipeline & Latest News Check */}
      <div
        data-spotlight="news-pipeline-card"
        className="instrument-panel instrument-ticks p-5 space-y-4"
      >
        <div
          aria-label="Analysis pipeline"
          className="rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3.5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PIPELINE_STEPS.map((label, idx) => {
              const stepNum = idx + 1;
              const completed = pipelineStage >= stepNum;
              const isCurrent =
                (isAnalysing || isAnalysingAll) && pipelineStage === stepNum;
              return (
                <motion.div
                  key={label}
                  animate={{
                    borderColor: completed ? 'var(--teal)' : 'var(--line)',
                    backgroundColor: completed
                      ? 'color-mix(in srgb, var(--teal) 14%, var(--navy))'
                      : 'var(--panel)',
                  }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className="rounded-lg border px-2.5 py-2 flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                      completed
                        ? 'bg-[var(--teal)] text-[var(--amber-ink)]'
                        : 'bg-[var(--navy)] text-[var(--muted)] border border-[var(--line)]'
                    }`}
                  >
                    {completed ? '✓' : stepNum}
                  </span>
                  <span
                    className={`font-semibold leading-tight ${
                      isCurrent
                        ? 'text-[var(--amber)]'
                        : completed
                          ? 'text-[var(--text)]'
                          : 'text-[var(--muted)]'
                    }`}
                  >
                    {label}
                  </span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight
                      className="hidden lg:block h-3 w-3 text-[var(--muted)]/40 ml-auto shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Single Analysis Output */}
        {currentResult && (
          <section aria-label="Latest news check" className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">
              Checked message result
            </h2>
            {renderAnalyzedCard(currentResult, false)}
          </section>
        )}
      </div>

      {/* Batch "Analyse all" Results */}
      {batchResults.length > 0 && (
        <section aria-label="All 12 samples analysed" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
                All {batchResults.length} sample checks ({graph.business.businessName})
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                Sorted with your highest-impact warnings ready to add to your alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const hitting = batchResults.filter(
                  (c) => c.impacts.length > 0 && !addedIds[c.id],
                );
                hitting.forEach((c) => handleAddCardToAlerts(c));
              }}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--amber)] bg-[var(--amber)]/15 px-4 text-xs sm:text-sm font-bold text-[var(--amber)] hover:bg-[var(--amber)]/25"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add matching alerts</span>
            </button>
          </div>

          <div className="space-y-4">
            {batchResults.map((card) => renderAnalyzedCard(card, true))}
          </div>
        </section>
      )}

      {/* Active Alerts Feed */}
      <section className="space-y-4 border-t border-[var(--line)] pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text)]">
            {t.ui.savedAlertsHeading} ({events.length})
          </h2>
        </div>

        {events.length === 0 ? (
          <RingEmptyState
            title={t.ui.everythingCalm}
            subtitle={t.sections.noTroublesYet}
          />
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const eventImpact =
                riskSummary.impacts.find((i) => i.eventId === ev.id) ?? null;
              return (
                <WhatsAppAlertBubble
                  key={ev.id}
                  event={ev}
                  impact={eventImpact}
                  onTraceRipple={() => {
                    setSelectedEventId(ev.id);
                    onNavigate('ripple');
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
