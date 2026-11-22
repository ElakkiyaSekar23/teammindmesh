import { assess, computeBusinessExposure, simulate } from './assess';
import { clamp, formatInr, haversineKm, roundTo } from './math';
import type {
  ActionItem,
  AlertLevel,
  ChainRiskSummary,
  RippleImpact,
  RipplePathStep,
  SupplyChainGraph,
  TrafficLight,
  TroubleEvent,
  WhyExplanation,
} from './types';

function lightToAlertLevel(light: TrafficLight): AlertLevel {
  if (light === 'Urgent') return 'critical';
  if (light === 'Danger') return 'warning';
  if (light === 'Watch') return 'watch';
  return 'safe';
}

export function simulateEventRipple(
  graph: SupplyChainGraph,
  event: TroubleEvent,
): RippleImpact[] {
  const assessments = assess(graph, event);
  const sim = simulate(graph, event, 1000, 42);

  return assessments.map((item) => {
    const affectedNode = item.chain[0];
    const distanceKm = haversineKm(event.lat, event.lng, affectedNode.lat, affectedNode.lng);

    const isCustomChain = item.chain.every((n) => n.id.startsWith('custom-'));

    const path: RipplePathStep[] = [
      ...item.chain.map((node, index) => {
        const link = graph.links.find(
          (l) =>
            l.fromId === node.id &&
            (index < item.chain.length - 1 ? l.toId === item.chain[index + 1].id : l.toId === 'YOU'),
        );
        return {
          supplierId: node.id,
          supplierName: node.name,
          layer: node.layer,
          itemSupplied: node.itemSupplied,
          city: node.city,
          stockDays: node.stockDays,
          sharePct: link?.sharePct ?? 100,
          transitDays: isCustomChain ? (link?.transitDays ?? 2) : 2,
        };
      }),
      {
        supplierId: 'YOU',
        supplierName: graph.business.businessName,
        layer: 0,
        itemSupplied: graph.business.businessKind,
        city: graph.business.city,
        stockDays: graph.business.ownStockDays,
        sharePct: 100,
        transitDays: 0,
      },
    ];

    const totalTransitDays = path.reduce((sum, step) => sum + step.transitDays, 0);

    const layer1Link = graph.links.find(
      (l) => l.fromId === item.chain[item.chain.length - 1]?.id && l.toId === 'YOU',
    );
    const pathDependencyPct = layer1Link?.sharePct ?? 80;

    const mitigationFactor = affectedNode.alternativesCount > 0 ? 0.65 : 0.45;
    const savingsIfActTodayInr = Math.round(item.moneyAtRisk * mitigationFactor);
    const dailyRate = item.exposedDays > 0 ? item.moneyAtRisk / item.exposedDays : 0;

    const dailyTimeline = Array.from({ length: 14 }, (_, idx) => {
      const day = idx + 1;
      const pastBuffer = Math.max(0, day - item.daysUntilHurt);
      const stockRemainingPct = Math.round(
        clamp(100 - (day / Math.max(1, item.daysUntilHurt + 2)) * 100, 0, 100),
      );
      const withoutActionCostInr = Math.round(pastBuffer * dailyRate);
      const withActionCostInr = Math.round(withoutActionCostInr * (1 - mitigationFactor));
      return {
        day,
        stockRemainingPct,
        withoutActionCostInr,
        withActionCostInr,
      };
    });

    let actionUrgency: RippleImpact['actionUrgency'] = 'monitor';
    let recommendedAction = `Keep watching ${affectedNode.name} in ${affectedNode.city} this week.`;
    const altHint = affectedNode.alternateSuppliers?.[0];

    if (event.verifiedStatus === 'unverified') {
      actionUrgency = 'verify_first';
      recommendedAction = `Call ${affectedNode.name} first to check if this forward is true before paying extra.`;
    } else if (item.exposedDays > 0 && item.riskScore >= 45) {
      actionUrgency = 'today';
      recommendedAction = altHint
        ? `Your stock lasts ${item.daysUntilHurt} days, trouble may last ${event.durationDays}. Order ${Math.min(7, item.exposedDays)} extra days from ${altHint} today.`
        : `Your stock lasts ${item.daysUntilHurt} days, trouble may last ${event.durationDays}. Lock ${Math.min(7, item.exposedDays)} extra days of ${affectedNode.itemSupplied} today.`;
    } else if (item.riskScore >= 25) {
      actionUrgency = 'this_week';
      recommendedAction = altHint
        ? `Keep ${altHint} ready as a backup for ${affectedNode.itemSupplied} this week.`
        : `Add a second backup vendor for ${affectedNode.itemSupplied} outside ${affectedNode.city}.`;
    }

    const whyByMetric: RippleImpact['whyByMetric'] = {
      riskScore: {
        metricId: 'riskScore',
        label: 'Warning Score',
        sentences: item.plainWhy,
        formula:
          'round(100 * severity * closeness * (0.40 * soleFactor + 0.35 * importance + 0.25 * stress))',
        inputs: {
          closeness: item.closeness,
          soleFactor: item.soleFactor,
          importance: affectedNode.importance,
          stress: item.stress,
          light: item.light,
        },
      },
      daysToImpact: {
        metricId: 'daysToImpact',
        label: 'Days Until It Hits You',
        sentences: [
          `We add the stock days of all ${item.chain.length} supplier(s) along this chain.`,
          isCustomChain
            ? `We add ${totalTransitDays} days of road transport across these routes.`
            : `We add 2 days of road transport per link (${item.chain.length * 2} days).`,
          `That gives ${item.daysUntilHurt} days before the trouble reaches your door.`,
        ],
        formula: isCustomChain
          ? 'B = sum(chain.stockDays) + sum(link.transitDays)'
          : 'B = sum(chain.stockDays) + 2 * chain.length',
        inputs: {
          chainLength: item.chain.length,
          stockDaysB: item.stockDays,
          transportDays: totalTransitDays,
          durationDays: event.durationDays,
          exposedDays: item.exposedDays,
        },
      },
      chanceOfRunningOutPct: {
        metricId: 'chanceOfRunningOutPct',
        label: 'Chance of Running Out',
        sentences: [
          `We ran ${sim.runs} what-if checks shifting how long the trouble lasts.`,
          `In ${sim.chanceOfRunningOutPct}% of those runs, the trouble lasted longer than your ${item.stockDays} stock days.`,
          `Likely loss is ${formatInr(sim.likelyCase.moneyAtRisk)}, rising to ${formatInr(sim.worstCase.moneyAtRisk)} in a bad stretch.`,
        ],
        formula: '1000 runs: duration ~ triangular(0.6*D, D, 1.8*D), severity +/-10%',
        inputs: {
          runs: sim.runs,
          chanceOfRunningOutPct: sim.chanceOfRunningOutPct,
          bestMoney: sim.bestCase.moneyAtRisk,
          likelyMoney: sim.likelyCase.moneyAtRisk,
          worstMoney: sim.worstCase.moneyAtRisk,
        },
      },
      costAtRiskInr: {
        metricId: 'costAtRiskInr',
        label: 'Money at Risk',
        sentences: [
          `This trouble leaves ${item.exposedDays} exposed day(s) beyond your stock cushion.`,
          `Your sole-source factor across this chain is ${roundTo(item.soleFactor, 2)}.`,
          `Waiting could cost ${formatInr(item.moneyAtRisk)}, while acting today can save ${formatInr(savingsIfActTodayInr)}.`,
        ],
        formula:
          event.pricePct !== undefined
            ? 'layer1.monthlySpend * pricePct * exposedDays / 30'
            : 'exposedDays * dailySalesLost * soleFactor',
        inputs: {
          exposedDays: item.exposedDays,
          soleFactor: item.soleFactor,
          moneyAtRisk: item.moneyAtRisk,
          savingsIfActToday: savingsIfActTodayInr,
        },
      },
    };

    return {
      eventId: event.id,
      eventTitle: event.title,
      sourceSupplierId: affectedNode.id,
      sourceSupplierName: affectedNode.name,
      sourceLayer: affectedNode.layer,
      verifiedStatus: event.verifiedStatus,
      hazardType: event.type,
      proximityKm: distanceKm,
      proximityScore: item.closeness,
      pathDependencyPct,
      daysToImpact: item.daysUntilHurt,
      daysRange: {
        earlyDays: Math.max(1, item.daysUntilHurt - Math.min(2, item.exposedDays)),
        likelyDays: item.daysUntilHurt,
        lateDays: item.daysUntilHurt + Math.max(2, sim.worstCase.exposedDays),
      },
      chanceOfRunningOutPct: sim.chanceOfRunningOutPct,
      costAtRiskInr: item.moneyAtRisk,
      savingsIfActTodayInr,
      riskScore: item.riskScore,
      alertLevel: lightToAlertLevel(item.light),
      light: item.light,
      rumourSafetyCapped: item.rumourSafetyCapped,
      assessment: item,
      simulation: sim,
      path,
      dailyTimeline,
      recommendedAction,
      actionUrgency,
      whyByMetric,
      confidence: {
        scorePct: Math.round(event.confidence * 100),
        trialCount: sim.runs,
        reasons: [
          `${event.verifiedStatus === 'verified' ? 'Confirmed source' : 'Unverified forward'} (${event.sourceName})`,
          `Closeness to affected supplier: ${Math.round(item.closeness * 100)}%`,
          `${sim.runs} seeded runs (best ${formatInr(sim.bestCase.moneyAtRisk)} · likely ${formatInr(sim.likelyCase.moneyAtRisk)} · worst ${formatInr(sim.worstCase.moneyAtRisk)})`,
        ],
      },
    };
  });
}

export function computeChainRiskSummary(
  graph: SupplyChainGraph,
  events: TroubleEvent[],
  completedActionIds: string[] = [],
): ChainRiskSummary {
  const allImpacts: RippleImpact[] = [];
  for (const ev of events) {
    allImpacts.push(...simulateEventRipple(graph, ev));
  }
  const sortedImpacts = allImpacts.sort(
    (a, b) => b.riskScore - a.riskScore || a.daysToImpact - b.daysToImpact,
  );

  const exposureScore = computeBusinessExposure(graph, events);
  const overallHealthScore = clamp(100 - exposureScore, 0, 100);

  const verifiedImpacts = sortedImpacts.filter((i) => i.verifiedStatus === 'verified');
  const unverifiedImpacts = sortedImpacts.filter((i) => i.verifiedStatus === 'unverified');

  const alertRank: Record<AlertLevel, number> = {
    safe: 0,
    watch: 1,
    warning: 2,
    critical: 3,
  };
  let highestAlertLevel: AlertLevel = 'safe';
  for (const imp of sortedImpacts) {
    if (alertRank[imp.alertLevel] > alertRank[highestAlertLevel]) {
      highestAlertLevel = imp.alertLevel;
    }
  }

  const earliestImpactDays =
    verifiedImpacts.length > 0
      ? Math.min(...verifiedImpacts.map((i) => i.daysToImpact))
      : sortedImpacts.length > 0
        ? Math.min(...sortedImpacts.map((i) => i.daysToImpact))
        : null;

  const totalCostAtRiskInr = verifiedImpacts.reduce((sum, i) => sum + i.costAtRiskInr, 0);
  const totalPotentialSavingsInr = verifiedImpacts.reduce(
    (sum, i) => sum + i.savingsIfActTodayInr,
    0,
  );

  const singleSourceCount = graph.suppliers.filter((s) => s.isSingleSource).length;
  const hiddenSupplierCount = graph.suppliers.filter((s) => s.layer > 1).length;

  const actions: ActionItem[] = sortedImpacts.map((imp) => {
    const id = `act-${imp.eventId}-${imp.sourceSupplierId}`;
    return {
      id,
      eventId: imp.eventId,
      supplierId: imp.sourceSupplierId,
      supplierName: imp.sourceSupplierName,
      layer: imp.sourceLayer,
      title: imp.recommendedAction,
      plainReason: `${imp.sourceSupplierName} (${imp.daysToImpact} days of stock cushion, ${imp.assessment.exposedDays} exposed days).`,
      urgency: imp.actionUrgency,
      potentialSavingsInr: imp.savingsIfActTodayInr,
      verifiedStatus: imp.verifiedStatus,
      completed: completedActionIds.includes(id),
    };
  });

  const overallWhy: WhyExplanation = {
    metricId: 'overallHealth',
    label: 'Hidden Exposure Score',
    sentences: [
      `Your business has ${graph.suppliers.length} suppliers across 3 layers, with ${singleSourceCount} single-source links.`,
      `Your overall exposure (${exposureScore}/100) is the average of your top 5 active warning scores.`,
      earliestImpactDays !== null
        ? `Your earliest confirmed warning hits in ${earliestImpactDays} days with ${formatInr(totalCostAtRiskInr)} at risk.`
        : `No active supply troubles are hurting your chain right now.`,
    ],
    formula: 'exposure = round(mean(top 5 risk scores)) or 0 if no active events',
    inputs: {
      exposureScore,
      topScoresConsidered: Math.min(5, sortedImpacts.length),
      singleSourceCount,
      verifiedWarnings: verifiedImpacts.length,
    },
  };

  return {
    businessId: graph.business.id,
    overallHealthScore,
    overallRiskScore: exposureScore,
    highestAlertLevel,
    earliestImpactDays,
    totalCostAtRiskInr,
    totalPotentialSavingsInr,
    singleSourceCount,
    hiddenSupplierCount,
    verifiedAlertCount: verifiedImpacts.length,
    unverifiedRumourCount: unverifiedImpacts.length,
    impacts: sortedImpacts,
    actions,
    overallWhy,
  };
}
