import { matchPlaceInText } from '../data/gazetteer';
import { clamp } from './math';
import type {
  EngineEvent,
  EventSourceKind,
  NewsLanguage,
  RiskEventType,
  SourceType,
  TroubleEvent,
  VerifiedStatus,
} from './types';

interface RiskPattern {
  type: RiskEventType;
  keywords: string[];
  defaultDurationDays: number;
  defaultGroup?: string;
}

/**
 * Word lists across all 8 languages (en, ta, hi, te, kn, ml, bn, mr)
 * for all 18 risk types.
 */
const RISK_PATTERNS: RiskPattern[] = [
  {
    type: 'flood',
    keywords: [
      'flood', 'floods', 'heavy rain', 'waterlog', 'submerged', 'overflow',
      'வெள்ளம்', 'கனமழை', 'மழை',
      'बाढ़', 'बारिश', 'जलभराव',
      'వరద', 'వరదలు', 'వర్షం',
      'ಪ್ರವಾಹ', 'ಮಳೆ',
      'വെള്ളപ്പൊക്കം', 'മഴ',
      'বন্যা', 'বৃষ্টি',
      'महापूर', ' पूर', 'मुसळधार',
    ],
    defaultDurationDays: 9,
  },
  {
    type: 'cyclone',
    keywords: [
      'cyclone', 'storm', 'gale', 'landfall', 'typhoon',
      'புயல்', 'சூறாவளி',
      'चक्रवात', 'तूफान',
      'తుఫాను', 'తుఫాన్',
      'ಚಂಡಮಾರುತ', 'ಗಾಳಿ',
      'ചുഴലിക്കാറ്റ്', 'കൊടുങ്കാറ്റ്',
      'ঘূর্ণিঝড়', 'ঝড়',
      'चक्रीवादळ', 'वादळ',
    ],
    defaultDurationDays: 10,
  },
  {
    type: 'heatwave',
    keywords: [
      'heatwave', 'heat wave', 'extreme heat', 'scorching', 'hot spell',
      'வெப்பம்', 'வெயில்', 'வெப்ப அலை',
      'लू', 'भीषण गर्मी', 'गर्मी',
      'ఎండ', 'ఎండలు', 'వేడి',
      'ಬಿಸಿಲು', 'ಬಿಸಿಗಾಳಿ',
      'ചൂട്', 'ഉഷ്ണതരംഗം',
      'তাপপ্রবাহ', 'গরম',
      'उष्णतेची लाट', 'उन्हाळा',
    ],
    defaultDurationDays: 12,
  },
  {
    type: 'water_shortage',
    keywords: [
      'water shortage', 'drought', 'dry spell', 'borewell dry', 'reservoir low',
      'நீர் தட்டுப்பாடு', 'வறட்சி', 'தண்ணீர் பற்றாக்குறை',
      'पानी की कमी', 'सूखा', 'जल संकट',
      'నీటి కొరత', 'కరువు',
      'ನೀರಿನ ಕೊರತೆ', 'ಬರ',
      'ജലക്ഷാമം', 'വരൾച്ച',
      'জলের অভাব', 'খরা',
      'पाणी टंचाई', 'दुष्काळ',
    ],
    defaultDurationDays: 14,
  },
  {
    type: 'power_outage',
    keywords: [
      'power outage', 'power cut', 'blackout', 'grid failure', 'load shedding',
      'மின்வெட்டு', 'மின் தடை',
      'बिजली कटौती', 'बिजली बंद',
      'విద్యుత్ కోత', 'కరెంట్',
      'ವಿದ್ಯುತ್ ಕಡಿತ', 'ಕರೆಂಟ್',
      'വൈദ്യുതി മുടക്കം', 'കറന്റ്',
      'বিদ্যুৎ বিভ্রাট', 'লোডশেডিং',
      'वीज कपात', 'भारनियमन',
    ],
    defaultDurationDays: 6,
  },
  {
    type: 'transport_strike',
    keywords: [
      'transport strike', 'lorry strike', 'truck strike', 'strike', 'bandh', 'union protest',
      'வேலைநிறுத்தம்', 'லாரி ஸ்டிரைக்', 'பந்த்',
      'हड़ताल', 'ट्रक हड़ताल', 'चक्का जाम',
      'సమ్మె', 'లారీ సమ్మె',
      'ಮುಷ್ಕರ', 'ಲಾರಿ ಮುಷ್ಕರ',
      'സമരം', 'ഹർത്താൽ',
      'ধর্মঘট', 'লরি ধর্মঘট',
      'संप', 'वाहतूक संप', 'बंद',
    ],
    defaultDurationDays: 10,
  },
  {
    type: 'port_congestion',
    keywords: [
      'port congestion', 'harbour jam', 'berth delay', 'port backlog', 'ship delay', 'port',
      'துறைமுகம்', 'துறைமுக நெரிசல்',
      'बंदरगाह जाम', 'पोर्ट देरी',
      'పోర్ట్', 'ఓడరేవు',
      'ಬಂದರು', 'ಪೋರ್ಟ್',
      'തുറമുഖം', 'പോർട്ട്',
      'বন্দর জট', 'বন্দর',
      'बंदर', 'बंदरगाह',
    ],
    defaultDurationDays: 14,
  },
  {
    type: 'highway_blockade',
    keywords: [
      'highway blockade', 'road block', 'highway closed', 'landslide road', 'nh closed',
      'சாலை மறியல்', 'நெடுஞ்சாலை',
      'हाईवे जाम', 'रास्ता रोको',
      'హైవే దిగ్బంధం', 'రోడ్డు',
      'ಹೆದ್ದಾರಿ ತಡೆ', 'ರಸ್ತೆ ತಡೆ',
      'ഹൈവേ ഉപരോധം', 'റോഡ്',
      'হাইওয়ে অবরোধ', 'রাস্তা অবরোধ',
      'महामार्ग रोको', 'रस्ता रोको',
    ],
    defaultDurationDays: 7,
  },
  {
    type: 'factory_fire',
    keywords: [
      'factory fire', 'plant fire', 'warehouse fire', 'blaze', 'fire accident',
      'தீ விபத்து', 'தொழிற்சாலை தீ',
      'फैक्ट्री में आग', 'आग लग गई',
      'ఫ్యాక్టరీ అగ్నిప్రమాదం', 'మంటలు',
      'ಕಾರ್ಖಾನೆ ಬೆಂಕಿ', 'ಬೆಂಕಿ',
      'ഫാക്ടറി തീപിടിത്തം', 'തീപിടിത്തം',
      'কারখানায় আগুন', 'আগুন',
      'कारखान्याला आग', 'आग',
    ],
    defaultDurationDays: 15,
  },
  {
    type: 'crop_disease',
    keywords: [
      'crop disease', 'blight', 'pest attack', 'fungus', 'wilt', 'leaf disease',
      'பயிர் நோய்', 'பூச்சி தாக்குதல்',
      'फसल रोग', 'कीट प्रकोप',
      'పంట తెగులు', 'పురుగు',
      'ಬೆಳೆ ರೋಗ', 'ಕೀಟ ಬಾಧೆ',
      'വിള രോഗം', 'കീടബാധ',
      'ফসল রোগ', 'পোকার আক্রমণ',
      'पिकांवर रोग', 'कीड',
    ],
    defaultDurationDays: 16,
    defaultGroup: 'tea',
  },
  {
    type: 'cattle_disease',
    keywords: [
      'cattle disease', 'lumpy skin', 'foot and mouth', 'dairy herd sick', 'livestock outbreak',
      'கால்நடை நோய்', 'மாடு நோய்',
      'पशु रोग', 'मवेशी बीमारी',
      'పశువుల వ్యాధి',
      'ಜಾನುವಾರು ರೋಗ',
      'കന്നുകാലി രോഗം',
      'গবাদি পশুর রোগ',
      'जनावरांचा आजार',
    ],
    defaultDurationDays: 14,
    defaultGroup: 'milk',
  },
  {
    type: 'raw_material_shortage',
    keywords: [
      'raw material shortage', 'shortage', 'scarce', 'stock out', 'out of stock', 'no resin', 'no steel',
      'தட்டுப்பாடு', 'பற்றாக்குறை',
      'कमी', 'कच्चे माल की कमी', 'किल्लत',
      'కొరత', 'లభ్యత లేదు',
      'ಕೊರತೆ', 'ಅಭಾವ',
      'ക്ഷാമം', 'കുറവ്',
      'সংকট', 'অভাব',
      'टंचाई', 'तुटवडा',
    ],
    defaultDurationDays: 14,
    defaultGroup: 'resin',
  },
  {
    type: 'export_ban',
    keywords: [
      'export ban', 'ban', 'customs restriction', 'shipment ban', 'quota freeze',
      'ஏற்றுமதி தடை', 'தடை',
      'निर्यात प्रतिबंध', 'रोक',
      'ఎగుమతి నిషేధం', 'నిషేధం',
      'ರಫ್ತು ನಿಷೇಧ', 'ನಿಷೇಧ',
      'കയറ്റുമതി നിരോധനം', 'നിരോധനം',
      'রপ্তানি নিষেধাজ্ঞা', 'নিষেধাজ্ঞা',
      'निर्यात बंदी', 'बंदी',
    ],
    defaultDurationDays: 18,
    defaultGroup: 'sugar',
  },
  {
    type: 'gas_shortage',
    keywords: [
      'gas shortage', 'lpg shortage', 'cylinder shortage', 'gas', 'lpg', 'cylinder', 'propane',
      'எரிவாயு', 'சிலிண்டர்', 'கேஸ் தட்டுப்பாடு',
      'गैस की कमी', 'सिलेंडर', 'एलपीजी',
      'గ్యాస్ కొరత', 'సిలిండర్',
      'ಗ್ಯಾಸ್ ಕೊರತೆ', 'ಸಿಲಿಂಡರ್',
      'ഗ്യാസ് ക്ഷാമം', 'സിലിണ്ടർ',
      'গ্যাস সংকট', 'সিলিন্ডার',
      'गॅस टंचाई', 'सिलिंडर',
    ],
    defaultDurationDays: 12,
    defaultGroup: 'gas',
  },
  {
    type: 'material_price_spike',
    keywords: [
      'price spike', 'price jump', 'costlier', 'price rise', 'rate surge', 'prices up', 'விலை உயர்வு',
      'दाम बढ़े', 'महंगा', 'कीमत बढ़ी',
      'ధరలు పెరిగాయి', 'ధర పెరుగుదల',
      'ಬೆಲೆ ಏರಿಕೆ', 'ಬೆಲೆ ಹೆಚ್ಚಳ',
      'വിലക്കയറ്റം', 'വില കൂടി',
      'দাম বেড়েছে', 'মূল্যবৃদ্ধি',
      'दर वाढले', 'भाव वाढले',
    ],
    defaultDurationDays: 20,
    defaultGroup: 'packaging',
  },
  {
    type: 'fuel_price_hike',
    keywords: [
      'fuel price hike', 'diesel hike', 'petrol hike', 'freight hike', 'fuel hike',
      'டீசல் விலை', 'பெட்ரோல் விலை',
      'डीजल महंगा', 'पेट्रोल दाम', 'किराया बढ़ा',
      'డీజిల్ ధర', 'పెట్రోల్',
      'ಡೀಸೆಲ್ ಬೆಲೆ', 'ಪೆಟ್ರೋಲ್',
      'ഡീസൽ വില', 'പെട്രോൾ',
      'ডিজেলের দাম', 'জ্বালানি',
      'डिझेल दरवाढ', 'पेट्रोल',
    ],
    defaultDurationDays: 21,
  },
  {
    type: 'supplier_shutdown',
    keywords: [
      'supplier shutdown', 'plant closed', 'plant halted', 'boiler shutdown', 'halted', 'closed', 'shutdown',
      'licence', 'license', 'closure order', 'safety closure', 'suspended',
      'ஆலை மூடல்', 'மூடப்பட்டது', 'நிறுத்தம்', 'உரிமம் ரத்து',
      'प्लांट बंद', 'कारखाना बंद', 'ठप', 'लाइसेंस रद्द',
      'ప్లాంట్ మూసివేత', 'మూసివేశారు', 'లైసెన్స్',
      'ಸ್ಥಾವರ ಸ್ಥಗಿತ', 'ಮುಚ್ಚಲಾಗಿದೆ', 'ಪರವಾನಗಿ', 'ಮುಚ್ಚಲು ಆದೇಶ',
      'പ്ലാന്റ് അടച്ചു', 'നിർത്തിവച്ചു',
      'কারখানা বন্ধ', 'বন্ধ হয়েছে',
      'प्रकल्प बंद', 'कारखाना बंद', 'परवाना रद्द',
    ],
    defaultDurationDays: 14,
  },
  {
    type: 'cyber_attack',
    keywords: [
      'cyber attack', 'ransomware', 'hacked', 'erp down', 'server breach', 'billing locked',
      'சைபர் தாக்குதல்', 'ஹேக்',
      'साइबर हमला', 'हैक',
      'సైబర్ దాడి',
      'ಸೈಬರ್ ದಾಳಿ',
      'സൈബർ ആക്രമണം',
      'সাইবার হামলা',
      'सायबर हल्ला',
    ],
    defaultDurationDays: 10,
  },
];

const SEVERITY_WORDS: Array<{ words: string[]; value: number }> = [
  { words: ['catastrophic', 'total collapse', 'completely destroyed', 'முழுமையாக', 'पूरी तरह तबाह'], value: 1.0 },
  { words: ['severe', 'heavy', 'halted', 'closed', 'shutdown', 'கடும்', 'கனமழை', 'भीषण', 'भारी', 'తీవ్రమైన', 'ಕಠಿಣ', 'കനത്ത', 'তীব্র', 'मुसळधार'], value: 0.8 },
  { words: ['serious', 'ban', 'shortage', 'strike', 'தடை', 'தட்டுப்பாடு', 'हड़ताल', 'कमी', 'संप', 'ধর্মঘট', 'సమ్మె'], value: 0.6 },
  { words: ['moderate', 'hike', 'delay', 'slowdown', 'விலை உயர்வு', 'देरी', 'పెరిగాయి', 'বাড়ে'], value: 0.4 },
  { words: ['minor', 'slight', 'mild', 'சிறிய', 'हल्की', 'स्वल्प'], value: 0.2 },
];

const GROUP_KEYWORDS: Array<{ group: string; tokens: string[] }> = [
  { group: 'milk', tokens: ['milk', 'dairy', 'cattle', 'fodder', 'paal', 'doodh', 'பால்', 'தீவனம்', 'दूध'] },
  { group: 'tea', tokens: ['tea', 'chai', 'leaf', 'dust', 'தேயிலை', 'चाय'] },
  { group: 'sugar', tokens: ['sugar', 'sugarcane', 'cheeni', 'jaggery', 'சர்க்கரை', 'चीनी', 'साखर', 'गन्ना'] },
  { group: 'gas', tokens: ['gas', 'lpg', 'cylinder', 'propane', 'butane', 'எரிவாயு', 'சிலிண்டர்', 'गैस', 'सिलेंडर'] },
  { group: 'resin', tokens: ['resin', 'polymer', 'nylon', 'granules', 'monomer', 'plastic', 'petrochemical'] },
  { group: 'steel', tokens: ['steel', 'bolt', 'fastener', 'wire', 'iron', 'alloy', 'स्टील'] },
  { group: 'aluminium', tokens: ['aluminium', 'aluminum', 'cnc', 'casting', 'foundry', 'bauxite', 'alumina', 'एल्यूमीनियम', 'अॅल्युमिनियम', 'ಸಿಎನ್‌ಸಿ'] },
  { group: 'packaging', tokens: ['paper', 'kraft', 'carton', 'box', 'pulp', 'jute', 'காগজ', 'কাগজ', 'প্যাকেজিং'] },
];

const RUMOUR_MARKERS = [
  'forwarded', 'forward', 'fwd:', 'whatsapp', 'rumour', 'rumor',
  'unconfirmed', 'someone told', 'heard that', 'share to all', 'urgent!!',
  'வதந்தி', 'அனுப்பப்பட்டது', 'அपुष्ट', 'अपुष्ट', 'अफवाह', 'फॉरवर्ड', 'फॉरवर्ड संदेश', 'चर्चा आहे',
];

const OFFICIAL_MARKERS = [
  'government notice', 'official notice', 'department', 'safety board', 'advisory',
  'அரசு அறிவிப்பு', 'துறை அறிவிப்பு', 'பால்வளத் துறை',
  'सरकारी अधिसूचना', 'अधिसूचना', 'मंत्रालय',
];

function normalizeIndicDigits(text: string): string {
  const digitMaps: Array<[RegExp, number]> = [
    [/[\u0966-\u096F]/g, 0x0966], // Devanagari ०-९
    [/[\u09E6-\u09EF]/g, 0x09e6], // Bengali ০-৯
    [/[\u0BE6-\u0BEF]/g, 0x0be6], // Tamil ௦-௯
    [/[\u0C66-\u0C6F]/g, 0x0c66], // Telugu ౦-౯
    [/[\u0CE6-\u0CEF]/g, 0x0ce6], // Kannada ೦-೯
    [/[\u0D66-\u0D6F]/g, 0x0d66], // Malayalam ൦-൯
  ];
  let out = text;
  for (const [regex, base] of digitMaps) {
    out = out.replace(regex, (ch) => String(ch.charCodeAt(0) - base));
  }
  return out;
}

function keywordMatches(textLower: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  if (/^[a-z0-9\s-]+$/i.test(kw)) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(textLower);
  }
  return textLower.includes(kw);
}

export function detectNewsLanguage(text: string): NewsLanguage {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0900-\u097F]/.test(text)) {
    if (/कारखाना|संप|साखर|वाहतूक|फटका|झाले|आहे|मुसळधार|अॅल्युमिनियम|दिवस|टंचाई|येथील|सायबर/.test(text)) {
      return 'mr';
    }
    return 'hi';
  }
  return 'en';
}

export function detectSourceKind(text: string, sourceType?: SourceType): EventSourceKind {
  if (sourceType === 'whatsapp_forward') return 'forward';
  const lower = text.toLowerCase();
  if (RUMOUR_MARKERS.some((m) => lower.includes(m.toLowerCase()))) return 'forward';
  if (sourceType === 'official_bulletin') return 'govt alert';
  if (sourceType === 'local_news' || sourceType === 'mandi_notice') return 'news';
  if (OFFICIAL_MARKERS.some((m) => lower.includes(m.toLowerCase()))) return 'govt alert';
  return 'news';
}

function extractDurationDays(text: string, defaultDays: number): number {
  const normalized = normalizeIndicDigits(text);
  const lower = normalized.toLowerCase();
  if (/(?:three weeks|3 weeks|மூன்று வாரம்|3 வாரம்|तीन सप्ताह|तीन हफ्ते)/i.test(lower)) {
    return 21;
  }
  if (/(?:two weeks|2 weeks|இரண்டு வாரம்|2 வாரம்|दो सप्ताह|दो हफ्ते)/i.test(lower)) {
    return 14;
  }
  const weekMatch = normalized.match(/(\d{1,2})\s*(?:weeks?|வாரம்|வாரங்கள்|सप्ताह|हफ्ते)/i);
  if (weekMatch && weekMatch[1]) {
    return clamp(Number(weekMatch[1]) * 7, 1, 30);
  }
  const match = normalized.match(
    /(\d{1,2})\s*(?:[-\s]*(?:day|days)|நாட்கள்|நாள்|दिन|రోజులు|ದಿನ|দিন|दिवस)/i,
  );
  if (match && match[1]) {
    return clamp(Number(match[1]), 1, 30);
  }
  return defaultDays;
}

function extractPricePct(text: string): number | undefined {
  const normalized = normalizeIndicDigits(text);
  const match = normalized.match(/(\d{1,3})\s*%/);
  if (match && match[1]) {
    return clamp(Number(match[1]) / 100, 0.05, 1.0);
  }
  return undefined;
}

function detectGroupInText(textLower: string): string | null {
  for (const entry of GROUP_KEYWORDS) {
    if (entry.tokens.some((tok) => keywordMatches(textLower, tok))) {
      return entry.group;
    }
  }
  return null;
}

/**
 * Offline keyword reader in all 8 languages for all 18 risk types,
 * severity words, and native-script city names.
 */
export function extractEventsRules(
  text: string,
  sourceKindOverride?: EventSourceKind,
): EngineEvent[] {
  const cleanText = text.trim();
  if (!cleanText) return [];

  const lower = cleanText.toLowerCase();
  const language = detectNewsLanguage(cleanText);
  const sourceKind = sourceKindOverride ?? detectSourceKind(cleanText);

  let bestPattern = RISK_PATTERNS[5]; // default transport_strike
  let bestHits = 0;
  for (const pattern of RISK_PATTERNS) {
    let hits = 0;
    for (const kw of pattern.keywords) {
      if (keywordMatches(lower, kw)) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestPattern = pattern;
    }
  }

  // Severity rubric: 0.2 minor, 0.4 moderate, 0.6 serious, 0.8 severe, 1.0 catastrophic
  let severity = 0.6;
  for (const band of SEVERITY_WORDS) {
    if (band.words.some((w) => keywordMatches(lower, w))) {
      severity = band.value;
      break;
    }
  }

  const pricePct =
    bestPattern.type === 'material_price_spike' || bestPattern.type === 'fuel_price_hike'
      ? extractPricePct(cleanText) ?? 0.25
      : undefined;

  if (pricePct !== undefined) {
    severity = clamp(pricePct / 0.5, 0.1, 1);
  }

  const place = matchPlaceInText(cleanText);
  const detectedGroup = detectGroupInText(lower);

  // Choose target matching risk category
  let target = place?.name ?? 'Chennai';
  if (
    bestPattern.type === 'crop_disease' ||
    bestPattern.type === 'cattle_disease' ||
    bestPattern.type === 'raw_material_shortage' ||
    bestPattern.type === 'export_ban' ||
    bestPattern.type === 'gas_shortage' ||
    bestPattern.type === 'material_price_spike'
  ) {
    target = detectedGroup ?? bestPattern.defaultGroup ?? 'milk';
  } else if (
    bestPattern.type === 'supplier_shutdown' ||
    bestPattern.type === 'cyber_attack'
  ) {
    // Map Dahej / Jamnagar / Peenya / Vellore known single-supplier hubs if named, else place city
    if (place?.name === 'Dahej') target = 'fac-l2-resin';
    else if (place?.name === 'Jamnagar') target = 'fac-l3-cracker';
    else if (place?.name === 'Bengaluru') target = 'fac-l1-cnc';
    else if (place?.name === 'Erode') target = 'shop-l3-feed';
    else if (place?.name === 'Chennai') target = 'shop-l1-gas';
    else target = place?.name ?? 'shop-l1-gas';
  }

  const durationDays = extractDurationDays(cleanText, bestPattern.defaultDurationDays);
  const confidence = sourceKind === 'forward' ? 0.35 : sourceKind === 'govt alert' ? 0.92 : 0.82;

  const translation =
    sourceKind === 'forward'
      ? `Unconfirmed forward mentions ${bestPattern.type.replace(/_/g, ' ')} affecting ${target}. Check with your vendor before paying extra.`
      : `Notice reports ${bestPattern.type.replace(/_/g, ' ')} near ${place?.name ?? target} for about ${durationDays} days.`;

  return [
    {
      id: `ev-rule-${Date.now()}`,
      type: bestPattern.type,
      target,
      severity,
      durationDays,
      pricePct,
      confidence,
      sourceKind,
      sourceText: cleanText,
      language,
      translation,
    },
  ];
}

export function detectVerifiedStatus(text: string, sourceType: SourceType): VerifiedStatus {
  const kind = detectSourceKind(text, sourceType);
  return kind === 'forward' ? 'unverified' : 'verified';
}

export function runOfflineRuleReader(params: {
  text: string;
  sourceType: SourceType;
  sourceName?: string;
  fallbackLat?: number;
  fallbackLng?: number;
  fallbackRegion?: string;
}): TroubleEvent {
  const sourceKind = detectSourceKind(params.text, params.sourceType);
  const extracted = extractEventsRules(params.text, sourceKind)[0];
  const place = matchPlaceInText(params.text);

  const region = place?.name ?? params.fallbackRegion ?? 'Chennai';
  const lat = place?.lat ?? params.fallbackLat ?? 13.0827;
  const lng = place?.lng ?? params.fallbackLng ?? 80.2707;
  const verifiedStatus: VerifiedStatus = sourceKind === 'forward' ? 'unverified' : 'verified';

  const typeLabel = (extracted?.type ?? 'transport_strike').replace(/_/g, ' ');
  const title =
    verifiedStatus === 'unverified'
      ? `Unverified report: ${typeLabel} (${extracted?.target ?? region})`
      : `Supply notice: ${typeLabel} near ${region}`;

  const detectedGroup = detectGroupInText(params.text.toLowerCase());
  const affectedKeywords = [
    extracted?.type ?? 'transport_strike',
    region.toLowerCase(),
    ...(detectedGroup ? [detectedGroup] : []),
  ];

  return {
    id: extracted?.id ?? `ev-custom-${Date.now()}`,
    type: extracted?.type ?? 'transport_strike',
    hazardType: extracted?.type ?? 'transport_strike',
    target: extracted?.target ?? region,
    severity: extracted?.severity ?? 0.6,
    durationDays: extracted?.durationDays ?? 8,
    expectedDurationDays: extracted?.durationDays ?? 8,
    pricePct: extracted?.pricePct,
    confidence: extracted?.confidence ?? 0.75,
    sourceKind,
    sourceText: params.text.trim(),
    language: extracted?.language ?? 'en',
    translation: extracted?.translation ?? params.text.trim(),
    title,
    rawText: params.text.trim(),
    plainSummary: extracted?.translation ?? params.text.trim(),
    sourceType: params.sourceType,
    sourceName:
      params.sourceName ||
      (verifiedStatus === 'unverified' ? 'Forwarded / Unconfirmed Message' : 'Offline Rule Reader'),
    verifiedStatus,
    region,
    lat,
    lng,
    affectedKeywords,
    publishedAt: new Date().toISOString(),
    readerMode: 'offline-rule',
  };
}
