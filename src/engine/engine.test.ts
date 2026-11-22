import assert from 'node:assert/strict';
import { FACTORY_CHAIN_GRAPH } from '../data/factory';
import { MULTILINGUAL_TEST_SNIPPETS } from '../data/sampleNews';
import { SHOP_CHAIN_GRAPH } from '../data/shop';
import {
  assess,
  computeBusinessExposure,
  detectSourceKind,
  extractEventsRules,
  getSeasonNote,
  runEngineVerificationSuite,
  SEASON_NOTES_SOUTH_INDIA,
  simulate,
} from './index';

// 1. Run all 8 accuracy scenario tests
const suite = runEngineVerificationSuite();
for (const item of suite) {
  assert.equal(item.passed, true, `Failed ${item.id}: ${item.name} -> ${item.actual}`);
}

// 2. Verify all 8 languages in extractEventsRules
const langChecks: Array<{ text: string; expectedLang: string }> = [
  { text: 'Heavy flood in Chennai for 6 days', expectedLang: 'en' },
  { text: 'வேலூர் பகுதியில் கனமழை வெள்ளம்', expectedLang: 'ta' },
  { text: 'कोल्हापुर में ट्रक हड़ताल', expectedLang: 'hi' },
  { text: 'గుంటూరులో తీవ్రమైన ఎండలు', expectedLang: 'te' },
  { text: 'ಬೆಂಗಳೂರು ವಿದ್ಯುತ್ ಕಡಿತ', expectedLang: 'kn' },
  { text: 'കൊച്ചി തുറമുഖത്ത് സമരം', expectedLang: 'ml' },
  { text: 'হাওড়া কাগজ মিলে ধর্মঘট', expectedLang: 'bn' },
  { text: 'कोल्हापूर वाहतूक संपामुळे साखर बंद', expectedLang: 'mr' },
];
for (const chk of langChecks) {
  const [ev] = extractEventsRules(chk.text);
  assert.equal(ev.language, chk.expectedLang, `Language mismatch for ${chk.text}`);
}

// 3. Verify computeBusinessExposure = 0 when no active events
assert.equal(computeBusinessExposure(SHOP_CHAIN_GRAPH, []), 0);
assert.equal(computeBusinessExposure(FACTORY_CHAIN_GRAPH, []), 0);

// 4. Verify South India 12-month season table
assert.equal(SEASON_NOTES_SOUTH_INDIA.length, 12);
assert.equal(getSeasonNote(11).label, 'Typical season pattern, not a forecast');

// 5. Verify simulate() returns 0s when event hits nothing
const farSim = simulate(
  SHOP_CHAIN_GRAPH,
  {
    id: 'far',
    type: 'flood',
    target: 'Delhi',
    severity: 0.9,
    durationDays: 10,
    confidence: 0.9,
    sourceKind: 'news',
    sourceText: 'Delhi flood',
    language: 'en',
    translation: 'Delhi flood',
  },
  1000,
  99,
);
assert.equal(farSim.chanceOfRunningOutPct, 0);
  assert.equal(assess(SHOP_CHAIN_GRAPH, {
  id: 'far2',
  type: 'flood',
  target: 'Delhi',
  severity: 0.9,
  durationDays: 10,
  confidence: 0.9,
  sourceKind: 'news',
  sourceText: 'Delhi flood',
  language: 'en',
  translation: 'Delhi flood',
}).length, 0);

// 6. Verify 12 native-script news samples including 3-week Thoothukudi flood, 2 govt alerts, 2 forwards
assert.equal(MULTILINGUAL_TEST_SNIPPETS.length, 12);
const [tuticorinFlood] = extractEventsRules(
  MULTILINGUAL_TEST_SNIPPETS[0].text,
  detectSourceKind(MULTILINGUAL_TEST_SNIPPETS[0].text, MULTILINGUAL_TEST_SNIPPETS[0].sourceType),
);
assert.equal(tuticorinFlood.language, 'ta');
assert.equal(tuticorinFlood.type, 'flood');
assert.equal(tuticorinFlood.target, 'Tuticorin');
assert.equal(tuticorinFlood.durationDays, 21);

const sourceKinds = MULTILINGUAL_TEST_SNIPPETS.map((s) =>
  detectSourceKind(s.text, s.sourceType),
);
assert.equal(sourceKinds.filter((k) => k === 'govt alert').length, 2);
assert.equal(sourceKinds.filter((k) => k === 'forward').length, 2);

console.log(`All ${suite.length} accuracy scenarios + 8-language + 12-sample + season tests passed!`);

