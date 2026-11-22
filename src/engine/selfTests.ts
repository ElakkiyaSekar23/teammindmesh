import { FACTORY_CHAIN_GRAPH } from '../data/factory';
import { SHOP_CHAIN_GRAPH } from '../data/shop';
import { assess, computeBusinessExposure, simulate } from './assess';
import { extractEventsRules } from './offlineReader';
import { getSeasonNote } from './season';
import type { EngineEvent, PersonaType, SelfTestResult } from './types';

export interface VerificationScenarioSpec {
  id: string;
  shortLabel: string;
  name: string;
  persona: PersonaType;
  event: EngineEvent;
  expectedSummary: string;
}

export const VERIFICATION_SCENARIOS: VerificationScenarioSpec[] = [
  {
    id: 'acc-1-l1-flood',
    shortLabel: '1. Layer-1 Flood',
    name: 'Scenario 1: Direct Layer-1 flood stock-days B & running-out money',
    persona: 'shop',
    event: {
      id: 'acc-1',
      type: 'flood',
      target: 'Chennai',
      severity: 0.8,
      durationDays: 7,
      confidence: 0.9,
      sourceKind: 'news',
      sourceText: 'Heavy flood in Chennai',
      language: 'en',
      translation: 'Heavy flood in Chennai',
    },
    expectedSummary: 'B=3d, exposed=4d, money=₹13600',
  },
  {
    id: 'acc-2-l3-chain',
    shortLabel: '2. Layer-3 Chain',
    name: 'Scenario 2: Layer-3 shock sums chain stock days + 2d/link transport',
    persona: 'shop',
    event: {
      id: 'acc-2',
      type: 'supplier_shutdown',
      target: 'shop-l3-feed',
      severity: 0.8,
      durationDays: 14,
      confidence: 0.85,
      sourceKind: 'news',
      sourceText: 'Erode cattle-feed mill closed',
      language: 'en',
      translation: 'Erode cattle-feed mill closed',
    },
    expectedSummary: 'chain=3, B=11d, exposed=3d, sole=0.6',
  },
  {
    id: 'acc-3-material-group',
    shortLabel: '3. Material Group',
    name: 'Scenario 3: Material risk targets only matching commodity group',
    persona: 'factory',
    event: {
      id: 'acc-3',
      type: 'raw_material_shortage',
      target: 'resin',
      severity: 0.8,
      durationDays: 20,
      confidence: 0.9,
      sourceKind: 'govt alert',
      sourceText: 'Nylon resin shortage',
      language: 'en',
      translation: 'Nylon resin shortage',
    },
    expectedSummary: '3 resin-group suppliers only',
  },
  {
    id: 'acc-4-price-formula',
    shortLabel: '4. Price Spike',
    name: 'Scenario 4: Price risk uses pricePct/0.5 severity & layer-1 monthlySpend formula',
    persona: 'factory',
    event: {
      id: 'acc-4',
      type: 'material_price_spike',
      target: 'packaging',
      severity: 0.2, // overridden by pricePct / 0.5 = 0.5
      durationDays: 24,
      pricePct: 0.25,
      confidence: 0.85,
      sourceKind: 'news',
      sourceText: 'Kraft paper price jumped 25%',
      language: 'en',
      translation: 'Kraft paper price jumped 25%',
    },
    expectedSummary: 'exposed=17d, money=₹144500',
  },
  {
    id: 'acc-5-single-supplier',
    shortLabel: '5. Cyber Attack',
    name: 'Scenario 5: Single-supplier risk hits target ID only and triggers Urgent',
    persona: 'factory',
    event: {
      id: 'acc-5',
      type: 'cyber_attack',
      target: 'fac-l1-cnc',
      severity: 1.0,
      durationDays: 10,
      confidence: 0.9,
      sourceKind: 'govt alert',
      sourceText: 'Peenya CNC ERP hit by ransomware',
      language: 'en',
      translation: 'Peenya CNC ERP hit by ransomware',
    },
    expectedSummary: '1 supplier (fac-l1-cnc), Urgent',
  },
  {
    id: 'acc-6-closeness-threshold',
    shortLabel: '6. Distant City',
    name: 'Scenario 6: Distant city (closeness < 0.15) is skipped cleanly',
    persona: 'shop',
    event: {
      id: 'acc-6',
      type: 'power_outage',
      target: 'Delhi',
      severity: 0.8,
      durationDays: 10,
      confidence: 0.9,
      sourceKind: 'news',
      sourceText: 'Delhi power outage',
      language: 'en',
      translation: 'Delhi power outage',
    },
    expectedSummary: '0 affected suppliers, exposure=0',
  },
  {
    id: 'acc-7-rumour-safety',
    shortLabel: '7. Rumour Cap',
    name: 'Scenario 7: Unverified forward is capped below Urgent (< 65)',
    persona: 'factory',
    event: {
      id: 'acc-7',
      type: 'supplier_shutdown',
      target: 'fac-l1-cnc',
      severity: 1.0,
      durationDays: 15,
      confidence: 0.3,
      sourceKind: 'forward',
      sourceText: 'Forwarded WhatsApp rumour: Peenya CNC closed!',
      language: 'en',
      translation: 'Unconfirmed forward claims Peenya CNC closed.',
    },
    expectedSummary: 'capped=true, light !== Urgent, score < 65',
  },
  {
    id: 'acc-8-simulate-and-rules',
    shortLabel: '8. Sim & Rules',
    name: 'Scenario 8: Seeded simulate() percentiles, 8-lang extractEventsRules & season note',
    persona: 'shop',
    event: {
      id: 'acc-8',
      type: 'flood',
      target: 'Erode',
      severity: 0.8,
      durationDays: 12,
      confidence: 0.9,
      sourceKind: 'news',
      sourceText: 'ஈரோடு பகுதியில் கனமழை வெள்ளம்',
      language: 'ta',
      translation: 'Heavy rain floods around Erode for 12 days.',
    },
    expectedSummary: 'Repeatable best<=likely<=worst, ta/mr/kn rules, season label',
  },
];

/**
 * Runs all 8 accuracy test scenarios against assess(), simulate(), extractEventsRules(), and getSeasonNote().
 * Used both by CLI unit tests and the "For judges" verification panel.
 */
export function runEngineVerificationSuite(): SelfTestResult[] {
  const results: SelfTestResult[] = [];

  // Scenario 1: Direct Layer-1 city flood (Chennai flood hits Murugan Dairy Booth: B = 1 + 2 = 3 days)
  const ev1 = VERIFICATION_SCENARIOS[0].event;
  const res1 = assess(SHOP_CHAIN_GRAPH, ev1);
  const milk1 = res1.find((r) => r.supplierId === 'shop-l1-milk');
  results.push({
    id: VERIFICATION_SCENARIOS[0].id,
    name: VERIFICATION_SCENARIOS[0].name,
    passed:
      Boolean(milk1) &&
      milk1!.closeness === 1 &&
      milk1!.stockDays === 3 &&
      milk1!.exposedDays === 4 &&
      milk1!.moneyAtRisk === Math.round(4 * 8500 * 0.4),
    expected: VERIFICATION_SCENARIOS[0].expectedSummary,
    actual: milk1
      ? `B=${milk1.stockDays}d, exposed=${milk1.exposedDays}d, money=₹${milk1.moneyAtRisk}`
      : 'missing',
  });

  // Scenario 2: Hidden Layer-3 shock passes through Layer 2 -> Layer 1 (Erode fodder -> Vellore -> Chennai)
  const ev2 = VERIFICATION_SCENARIOS[1].event;
  const res2 = assess(SHOP_CHAIN_GRAPH, ev2);
  const feed2 = res2[0];
  results.push({
    id: VERIFICATION_SCENARIOS[1].id,
    name: VERIFICATION_SCENARIOS[1].name,
    passed:
      Boolean(feed2) &&
      feed2.chain.length === 3 &&
      feed2.stockDays === 11 &&
      feed2.exposedDays === 3 &&
      Math.abs(feed2.soleFactor - 0.6) < 0.01,
    expected: VERIFICATION_SCENARIOS[1].expectedSummary,
    actual: feed2
      ? `chain=${feed2.chain.length}, B=${feed2.stockDays}d, exposed=${feed2.exposedDays}d, sole=${feed2.soleFactor}`
      : 'missing',
  });

  // Scenario 3: Material group risk matches only suppliers in target group
  const ev3 = VERIFICATION_SCENARIOS[2].event;
  const res3 = assess(FACTORY_CHAIN_GRAPH, ev3);
  results.push({
    id: VERIFICATION_SCENARIOS[2].id,
    name: VERIFICATION_SCENARIOS[2].name,
    passed: res3.length === 3 && res3.every((r) => r.chain[0].group === 'resin'),
    expected: VERIFICATION_SCENARIOS[2].expectedSummary,
    actual: `${res3.length} suppliers (${res3.map((r) => r.chain[0].group).join(',')})`,
  });

  // Scenario 4: Price risk formula: severity = min(1, pricePct/0.5), money = monthlySpend * pricePct * exposedDays / 30
  const ev4 = VERIFICATION_SCENARIOS[3].event;
  const res4 = assess(FACTORY_CHAIN_GRAPH, ev4);
  const packL1 = res4.find((r) => r.supplierId === 'fac-l1-pack');
  results.push({
    id: VERIFICATION_SCENARIOS[3].id,
    name: VERIFICATION_SCENARIOS[3].name,
    passed:
      Boolean(packL1) &&
      packL1!.exposedDays === 17 &&
      packL1!.moneyAtRisk === 144500,
    expected: VERIFICATION_SCENARIOS[3].expectedSummary,
    actual: packL1 ? `exposed=${packL1.exposedDays}d, money=₹${packL1.moneyAtRisk}` : 'missing',
  });

  // Scenario 5: Single-supplier cyber attack hits only that ID and marks sole-source Urgent
  const ev5 = VERIFICATION_SCENARIOS[4].event;
  const res5 = assess(FACTORY_CHAIN_GRAPH, ev5);
  results.push({
    id: VERIFICATION_SCENARIOS[4].id,
    name: VERIFICATION_SCENARIOS[4].name,
    passed:
      res5.length === 1 &&
      res5[0].supplierId === 'fac-l1-cnc' &&
      res5[0].light === 'Urgent',
    expected: VERIFICATION_SCENARIOS[4].expectedSummary,
    actual: `${res5.length} supplier (${res5[0]?.supplierId}), ${res5[0]?.light}`,
  });

  // Scenario 6: Far-away city (Delhi) skipped because closeness < 0.15
  const ev6 = VERIFICATION_SCENARIOS[5].event;
  const res6 = assess(SHOP_CHAIN_GRAPH, ev6);
  const exposure6 = computeBusinessExposure(SHOP_CHAIN_GRAPH, [ev6]);
  results.push({
    id: VERIFICATION_SCENARIOS[5].id,
    name: VERIFICATION_SCENARIOS[5].name,
    passed: res6.length === 0 && exposure6 === 0,
    expected: VERIFICATION_SCENARIOS[5].expectedSummary,
    actual: `${res6.length} affected, exposure=${exposure6}`,
  });

  // Scenario 7: Rumour safety — forward never triggers Urgent (>= 65) by itself
  const ev7 = VERIFICATION_SCENARIOS[6].event;
  const res7 = assess(FACTORY_CHAIN_GRAPH, ev7);
  results.push({
    id: VERIFICATION_SCENARIOS[6].id,
    name: VERIFICATION_SCENARIOS[6].name,
    passed:
      res7.length === 1 &&
      res7[0].rumourSafetyCapped &&
      res7[0].light !== 'Urgent' &&
      res7[0].riskScore < 65,
    expected: VERIFICATION_SCENARIOS[6].expectedSummary,
    actual: `capped=${String(res7[0]?.rumourSafetyCapped)}, light=${res7[0]?.light}, score=${res7[0]?.riskScore}`,
  });

  // Scenario 8: Seeded simulate(1000, seed) repeatability + 8-language extractEventsRules + season note
  const simA = simulate(SHOP_CHAIN_GRAPH, ev1, 1000, 77);
  const simB = simulate(SHOP_CHAIN_GRAPH, ev1, 1000, 77);
  const taRule = extractEventsRules('ஈரோடு பகுதியில் கனமழை வெள்ளம்')[0];
  const mrRule = extractEventsRules('कोल्हापूर साखर कारखान्याबाहेर वाहतूक संप')[0];
  const knRule = extractEventsRules('ಬೆಂಗಳೂರು ವಿದ್ಯುತ್ ಕಡಿತ')[0];
  const seasonOct = getSeasonNote(10);

  const simOk =
    simA.chanceOfRunningOutPct === simB.chanceOfRunningOutPct &&
    simA.likelyCase.moneyAtRisk === simB.likelyCase.moneyAtRisk &&
    simA.worstCase.moneyAtRisk >= simA.likelyCase.moneyAtRisk &&
    simA.likelyCase.moneyAtRisk >= simA.bestCase.moneyAtRisk;
  const rulesOk =
    taRule?.language === 'ta' &&
    taRule?.type === 'flood' &&
    taRule?.target === 'Erode' &&
    mrRule?.language === 'mr' &&
    mrRule?.type === 'transport_strike' &&
    knRule?.language === 'kn' &&
    knRule?.type === 'power_outage' &&
    seasonOct.label === 'Typical season pattern, not a forecast';

  results.push({
    id: VERIFICATION_SCENARIOS[7].id,
    name: VERIFICATION_SCENARIOS[7].name,
    passed: simOk && rulesOk,
    expected: VERIFICATION_SCENARIOS[7].expectedSummary,
    actual: `runOut=${simA.chanceOfRunningOutPct}%, best/likely/worst=₹${simA.bestCase.moneyAtRisk}/₹${simA.likelyCase.moneyAtRisk}/₹${simA.worstCase.moneyAtRisk}`,
  });

  return results;
}
