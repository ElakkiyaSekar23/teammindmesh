import React, { useState } from 'react';
import { CheckCircle2, Code2, FlaskConical, Play, ShieldAlert, Sigma } from 'lucide-react';
import { VERIFICATION_SCENARIOS } from '../engine';
import { useDeepTier } from '../state/store';

export function JudgesPanel() {
  const {
    judgesMode,
    t,
    auditHistory,
    riskSummary,
    selfTests,
    activeScenarioId,
    loadVerificationScenario,
  } = useDeepTier();
  const [activeTab, setActiveTab] = useState<'cypher' | 'formulas' | 'tests'>('formulas');

  if (!judgesMode) return null;

  const passedCount = selfTests.filter((test) => test.passed).length;

  return (
    <section
      id="judges-panel"
      data-spotlight="judges-panel"
      aria-label={t.judges.panelTitle}
      className="mt-6"
    >
      <div className="instrument-panel instrument-ticks p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text)]">
              {t.judges.panelTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              {t.judges.panelSubtitle}
            </p>
          </div>
          <div
            role="tablist"
            aria-label={t.judges.panelTitle}
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cypher'}
              onClick={() => setActiveTab('cypher')}
              className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'cypher'
                  ? 'bg-[var(--amber)] text-[var(--amber-ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t.judges.cypherTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'formulas'}
              onClick={() => setActiveTab('formulas')}
              className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'formulas'
                  ? 'bg-[var(--amber)] text-[var(--amber-ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Sigma className="h-3.5 w-3.5" aria-hidden="true" />
              {t.judges.formulasTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tests'}
              onClick={() => setActiveTab('tests')}
              className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'tests'
                  ? 'bg-[var(--amber)] text-[var(--amber-ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              {t.judges.testsTab} ({passedCount}/{selfTests.length})
            </button>
          </div>
        </div>

        {/* Part 5: 8-Test Scenario Switcher */}
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--navy)] p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--amber)]">
              Part 5 · Interactive 8-Scenario Switcher
            </span>
            <span className="text-[11px] text-[var(--muted)]">
              Click any scenario to load its world, inject its event, and verify exact engine math live
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VERIFICATION_SCENARIOS.map((spec) => {
              const isActive = activeScenarioId === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => loadVerificationScenario(spec.id)}
                  aria-pressed={isActive}
                  className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--amber-ink)]'
                      : 'border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--amber)]'
                  }`}
                >
                  <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                  <span>{spec.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'cypher' && (
          <div className="mt-4 space-y-3">
            {auditHistory.slice(0, 5).map((audit, idx) => (
              <div key={`${audit.actionName}-${idx}`} className="instrument-panel-raised p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--teal)]">{audit.actionName}</span>
                  <span className="text-[var(--muted)]">{audit.description}</span>
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-xs text-[var(--text)] leading-relaxed">
                  {audit.query}
                </pre>
                <div className="mt-2 font-mono text-[11px] text-[var(--muted)] break-all">
                  Params: {JSON.stringify(audit.params)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {riskSummary.impacts.slice(0, 2).map((imp) => (
              <div key={`${imp.eventId}-${imp.sourceSupplierId}`} className="instrument-panel-raised p-4">
                <div className="text-xs font-semibold text-[var(--teal)]">
                  {imp.sourceSupplierName} · {imp.eventTitle}
                </div>
                <div className="mt-2 space-y-1.5 font-mono text-[11px] text-[var(--text)]">
                  {imp.assessment.formulaTerms.map((term) => (
                    <div
                      key={term.label}
                      className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-1"
                    >
                      <div>
                        <span className="font-semibold text-[var(--text)]">{term.label}: </span>
                        <span className="text-[var(--muted)]">{term.expression}</span>
                      </div>
                      <span className="font-bold text-[var(--amber)] tabular-nums shrink-0">
                        {String(term.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-1 text-xs text-[var(--muted)]">
                  <div className="font-semibold text-[var(--text)]">
                    {t.judges.confidenceLabel}: {imp.confidence.scorePct}% ({imp.confidence.trialCount} seeded runs)
                  </div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {imp.confidence.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="mt-4 space-y-2">
            {selfTests.map((test) => (
              <div
                key={test.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 instrument-panel-raised p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-[var(--risk-urgent)] shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-medium text-[var(--text)]">{test.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="font-mono text-[11px] text-[var(--muted)] tabular-nums">
                    {test.actual}
                  </div>
                  <button
                    type="button"
                    onClick={() => loadVerificationScenario(test.id)}
                    className="min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--navy)] px-3 py-1.5 text-[11px] font-semibold text-[var(--amber)] hover:border-[var(--amber)]"
                  >
                    Load live
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
