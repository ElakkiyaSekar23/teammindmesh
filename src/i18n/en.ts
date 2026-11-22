import type { TranslationKeys } from './types';

export const en: TranslationKeys = {
  brandName: 'DeepTier',
  oneLineIdea:
    'See the suppliers behind your suppliers, and get warned before their problems become yours.',
  nav: {
    overview: 'Today',
    chainMap: 'My Chain',
    ripple: 'Risks',
    newsWatch: 'News',
    actions: 'Plan',
  },
  persona: {
    label: 'World',
    shopTitle: 'Small Shop',
    shopSubtitle: 'Sri Murugan Tea & Bakery, Chennai',
    factoryTitle: 'Factory',
    factorySubtitle: 'Kaveri Precision Auto Parts, Hosur',
  },
  controls: {
    forJudges: 'For judges',
    watchingTrouble: 'Watching for trouble',
    pickWorld: 'Pick your world',
    languageLabel: 'Language',
    themeDark: 'Dark',
    themeLight: 'Light',
    whyButton: 'Why?',
    close: 'Close',
    listenAloud: 'Read aloud',
    stopListening: 'Stop voice',
    speakInput: 'Speak news',
    checkNews: 'Check how this affects you',
    discoverHidden: 'Sharpen outer rings',
    addSupplier: 'Add supplier',
    resetDemo: 'Reset sample',
    offlineReaderBadge: 'Offline reader',
    aiReaderBadge: 'Smart reader',
    unverifiedBadge: 'Unverified',
    verifiedBadge: 'Confirmed source',
    shareWhatsApp: 'Share on WhatsApp',
    sourceNews: 'News',
    sourceGovt: 'Govt notice',
    sourceForward: 'Forward - Unverified',
    sourceManual: 'Your note',
    withoutDeepTier: 'Without DeepTier',
    withDeepTier: 'With DeepTier',
    daysUntilHurtsLabel: 'days until it hurts you',
    doThisToday: 'Do this today',
    plainWhyHeading: 'Why?',
    tapForDetails: 'Tap for ripple, why & steps',
  },
  worldPicker: {
    heading: 'Pick your world',
    subheading:
      'Start with a ready example in one tap, or build your own shop supply chain in under 30 seconds.',
    smallShopTitle: 'Small Shop (World B)',
    smallShopDesc:
      'Tea stall, kirana, bakery, restaurant, medical store, or hardware shop. Loads Sri Murugan Tea & Bakery as a ready demo.',
    smallShopCta: 'Open Sri Murugan Tea & Bakery',
    factoryTitle: 'Factory (World A)',
    factoryDesc:
      'For procurement heads, risk teams, and production planners. Tracks polymer resin, castings, steel bolts, and packaging.',
    factoryCta: 'Open Kaveri Precision Auto Parts',
    buildShopTitle: 'Build my shop',
    buildShopDesc:
      'Pick your shop type, tick what you sell, and tune how many days of stock you keep.',
    buildShopCta: 'Build my shop',
    stepShopType: '1. Pick your shop type',
    stepProducts: '2. Tick the products you sell',
    typicalChainLabel: 'Typical chain - tap to edit',
    stockDaysSliderLabel: 'Stock days kept',
    shopNameLabel: 'Your shop name',
    saveCustomShopCta: 'Start watching my shop',
    backToWorlds: 'Back to Pick your world',
  },
  layers: {
    layer1: 'Your suppliers',
    layer2: 'Their suppliers',
    layer3: "Their suppliers' suppliers",
    you: 'You',
  },
  metrics: {
    healthScoreTitle: 'Chain safety',
    healthScoreMeaning: 'out of 100: higher means your supply chain is calm today.',
    exposedScoreTitle: 'How exposed are you to things you cannot see?',
    daysLeftTitle: 'Days until it hits you',
    daysLeftMeaning: 'days: how long your stock will last before this hurts you.',
    chanceOutTitle: 'Chance of running out',
    chanceOutMeaning: 'chance shelves or machines run short before trucks recover.',
    moneyAtRiskTitle: 'Money at risk',
    moneyAtRiskMeaning: 'rupees you could lose if you wait without acting.',
    saveTodayTitle: 'Save if you act today',
    saveTodayMeaning: 'rupees you can protect by acting early.',
    proximityTitle: 'How close the trouble is',
    proximityMeaning: 'how close the trouble is to your supplier in distance.',
    stockDaysUnit: 'stock days',
  },
  metricTooltips: {
    daysUntilHits:
      'Total days of stock sitting across this chain path plus transit time before your own shelf or machine feels the shortage.',
    stockCushion:
      'How many days you and your upstream suppliers can keep running from existing stock before a halt reaches your door.',
    chainExposure:
      'A 0 to 100 score of how exposed your whole supply chain is right now. Higher means more urgent trouble behind your vendors.',
    withoutVsWith:
      'Without DeepTier you only see your direct vendors (mostly calm). With DeepTier you spot trouble two or three steps behind them.',
    headStart:
      'Extra warning days you gain by watching your suppliers’ suppliers before shelves actually run empty.',
    visibleVsHidden:
      'Direct vendors you pay vs deeper raw-material and wholesale suppliers standing behind them.',
    chanceOut:
      'How likely it is (from 500 what-if checks) that this trouble lasts longer than your stock cushion.',
    moneyAtRisk:
      'Estimated daily sales or factory output in rupees you could lose if you wait until stock runs out.',
    savingsToday:
      'Rupees you protect by ordering extra stock or calling a backup vendor right now.',
    supplyShare:
      'How much of this item comes through this supplier path. High share with no backup means bigger disruption.',
    riskScore:
      'Plain 0 to 100 warning score combining how bad the trouble is, how close it is, how long stock lasts, and whether you have a backup.',
    bestLikelyWorst:
      'Three plain outcomes if trucks recover faster (Best), as expected (Likely), or slower than usual (Worst).',
    stockLeftPct:
      'Share of normal stock remaining on each upcoming day if nothing changes vs if you order or switch early.',
    shortageDays:
      'Number of days the trouble outlasts the stock sitting in your chain.',
    onTimePct:
      'Share of recent deliveries from this vendor that arrived on the promised day.',
    confidence:
      'How sure the reader is about this report: official notices and news rate high; unverified WhatsApp forwards rate low.',
    severity:
      'How serious the disruption or price jump is on a 0% to 100% scale.',
    proximity:
      'How close the reported trouble is in kilometres to the supplier’s town or factory.',
    landingLayers:
      'Direct suppliers, their suppliers, and the raw-material sources behind them.',
    landingLanguages:
      'Reads news and forwards in Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, and English.',
    landingRisks:
      'Tracks floods, strikes, power cuts, fires, crop illness, port delays, price jumps, and shutdowns.',
    landingHeadStart:
      'Extra days of warning before hidden supplier problems empty your shelves.',
  },
  ui: {
    goodMorning: 'Good morning',
    everythingCalm: 'Everything looks calm today',
    oneThingNeedsAttention: '1 thing needs attention',
    thingsNeedAttention: 'things need attention',
    checkAnotherMessage: 'Check another message',
    checkLocalNewsCta: 'Check local news',
    noFilterMatches: 'No suppliers match your current filters.',
    clearFilters: 'Clear filters',
    showHiddenLayers: 'Show hidden layers',
    findWeakSpots: 'Find my weak spots',
    hideWeakSpots: 'Hide weak spots',
    noBackupOnly: 'No backup',
    markTopStepDone: 'Mark top step done',
    markDone: 'Mark done',
    done: 'Done',
    completedSteps: 'Completed',
    pendingSteps: 'Still to do',
    allStepsDone: 'All steps completed. You are covered for now.',
    stockCushionLabel: 'Stock days kept',
    ownStockDays: 'Your own stock',
    exposedGapLabel: 'Gap after stock ends',
    bestCase: 'Best case',
    likelyCase: 'Likely case',
    worstCase: 'Worst case',
    dayByDayTimeline: 'Day-by-day stock timeline',
    stockRemainingLabel: 'Stock left (%)',
    shortageDaysLabel: 'Shortage days',
    replay: 'Replay',
    loadingMap: 'Loading map view...',
    mapLoadError: 'Could not load this map view.',
    tryAgain: 'Try again',
    enterMessageFirst: 'Please paste or type a short news update first.',
    fillSupplierFields: 'Please enter a supplier name, item, and city.',
    voiceNotSupported:
      'Microphone voice input is not supported in this browser. Please type, paste, or pick a sample.',
    ttsNotSupported: 'Voice read-aloud is not supported in this browser.',
    offlineFallbackNotice:
      'Used the built-in Offline Reader so your check stayed fast and private.',
    savedAlertsHeading: 'Your saved alerts',
    analyseButton: 'Analyse',
    surpriseMe: 'Surprise me',
    readingNews: 'Reading language and checking your chain...',
    noRelevantTroubleTitle: 'Looks calm — no supplier trouble found',
    noRelevantTroubleDesc:
      'This message does not mention any flood, strike, shortage, or price jump near your suppliers.',
    addToMyAlerts: 'Add to my alerts',
    addedToAlerts: 'Added to alerts',
    startNowCta: 'Start now',
    tryFactoryCta: 'Try the factory demo',
    takeTourCta: '2-minute guided tour',
    supplyShareLabel: 'Supply share',
    onTimeLabel: 'On-time',
    confidenceLabel: 'Source trust',
    severityLabel: 'Strength',
    headStartLabel: 'Head start gained',
  },
  alerts: {
    safe: 'Safe',
    watch: 'Watch',
    warning: 'Danger',
    critical: 'Urgent',
    rumourCapNote: 'This came from a forward or unknown source. Verify it before paying extra.',
  },
  sections: {
    overviewHeading: 'Today at a glance',
    overviewSub: 'Clear countdowns, plain reasons, and one clear step you can take today.',
    chainMapHeading: 'The Hidden Layers',
    chainMapSub:
      'You sit at the center. Outer rings start foggy until DeepTier reveals who stands behind your vendors.',
    newsWatchHeading: 'Local news & forwards',
    newsWatchSub:
      'Type, paste, or speak news in Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, or English.',
    newsPlaceholder:
      'Paste a local news headline, mandi notice, or WhatsApp forward here...',
    rippleHeading: 'Ripple along your chain',
    rippleSub:
      'Like a stone dropped in water, see how a problem travels ring by ring toward you.',
    actionsHeading: 'Your action plan today',
    actionsSub: 'Ranked by how fast trouble reaches your door.',
    noTroublesYet: 'Everything looks calm. Check local news to test a new trouble report.',
  },
  judges: {
    panelTitle: 'Technical View (For Judges)',
    panelSubtitle:
      'Deterministic formulas, equivalent Neo4j Cypher queries, confidence intervals, and engine tests.',
    cypherTab: 'Cypher Query',
    formulasTab: 'Formulas & Confidence',
    testsTab: 'Engine Self-Tests',
    confidenceLabel: 'Confidence details',
  },
};
