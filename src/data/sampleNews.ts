import type { PersonaType, TroubleEvent } from '../engine/types';

export const SAMPLE_NEWS_EVENTS: Record<PersonaType, TroubleEvent[]> = {
  shop: [
    {
      id: 'ev-shop-ta-flood',
      type: 'flood',
      hazardType: 'flood',
      target: 'Vellore',
      region: 'Vellore',
      lat: 12.9165,
      lng: 79.1325,
      severity: 0.8,
      durationDays: 10,
      expectedDurationDays: 10,
      confidence: 0.9,
      sourceKind: 'news',
      sourceType: 'local_news',
      sourceName: 'Dinamalar Regional Desk',
      verifiedStatus: 'verified',
      language: 'ta',
      sourceText:
        'ஈரோடு மற்றும் வேலூர் மாவட்டங்களில் கனமழை காரணமாக பால் குளிரூட்டும் நிலையம் மற்றும் கால்நடை தீவன லாரிகள் செல்ல முடியாமல் போக்குவரத்து பாதிக்கப்பட்டுள்ளது.',
      rawText:
        'ஈரோடு மற்றும் வேலூர் மாவட்டங்களில் கனமழை காரணமாக பால் குளிரூட்டும் நிலையம் மற்றும் கால்நடை தீவன லாரிகள் செல்ல முடியாமல் போக்குவரத்து பாதிக்கப்பட்டுள்ளது.',
      translation:
        'Heavy rain has flooded roads around Erode and Vellore. Cattle-feed trucks and milk tankers are delayed.',
      plainSummary:
        'Heavy rain has flooded roads around Erode and Vellore. Cattle-feed trucks and milk tankers are delayed.',
      title: 'Heavy rain floods Erode & Vellore dairy roads',
      affectedKeywords: ['milk', 'dairy', 'fodder', 'cattle', 'flood', 'vellore', 'erode'],
      publishedAt: '2026-11-20T07:30:00Z',
      readerMode: 'offline-rule',
    },
    {
      id: 'ev-shop-hi-strike',
      type: 'transport_strike',
      hazardType: 'transport_strike',
      target: 'Kolhapur',
      region: 'Kolhapur',
      lat: 16.705,
      lng: 74.2433,
      severity: 0.6,
      durationDays: 18,
      expectedDurationDays: 18,
      confidence: 0.88,
      sourceKind: 'govt alert',
      sourceType: 'mandi_notice',
      sourceName: 'Mandi Vyapar Bulletin',
      verifiedStatus: 'verified',
      language: 'hi',
      sourceText:
        'कोल्हापुर की चीनी मिलों के बाहर ट्रांसपोर्ट यूनियन की हड़ताल से चीनी के ट्रकों की आवाजाही रुकी हुई है।',
      rawText:
        'कोल्हापुर की चीनी मिलों के बाहर ट्रांसपोर्ट यूनियन की हड़ताल से चीनी के ट्रकों की आवाजाही रुकी हुई है।',
      translation:
        'A transport strike outside Kolhapur sugar mills has stopped sugar trucks.',
      plainSummary:
        'A transport strike outside Kolhapur sugar mills has stopped sugar trucks.',
      title: 'Sugar mill transport strike in Kolhapur',
      affectedKeywords: ['sugar', 'sugarcane', 'kolhapur', 'transport_strike', 'cheeni'],
      publishedAt: '2026-11-20T09:15:00Z',
      readerMode: 'offline-rule',
    },
    {
      id: 'ev-shop-rumour-gas',
      type: 'gas_shortage',
      hazardType: 'gas_shortage',
      target: 'gas',
      region: 'Chennai',
      lat: 13.2167,
      lng: 80.321,
      severity: 0.8,
      durationDays: 15,
      expectedDurationDays: 15,
      confidence: 0.35,
      sourceKind: 'forward',
      sourceType: 'whatsapp_forward',
      sourceName: 'Unknown WhatsApp Forward',
      verifiedStatus: 'unverified',
      language: 'en',
      sourceText:
        'Forwarded WhatsApp message: Rumour says Ennore gas bottling plant closed for 15 days and commercial LPG cylinders will double in price tomorrow!',
      rawText:
        'Forwarded WhatsApp message: Rumour says Ennore gas bottling plant closed for 15 days and commercial LPG cylinders will double in price tomorrow!',
      translation:
        'A forwarded WhatsApp rumour claims the Ennore gas plant closed and prices will double. This is unconfirmed.',
      plainSummary:
        'A forwarded WhatsApp rumour claims the Ennore gas plant closed and prices will double. This is unconfirmed.',
      title: 'Unverified forward claims commercial gas cylinder ban in Chennai',
      affectedKeywords: ['lpg', 'gas', 'cylinder', 'ennore'],
      publishedAt: '2026-11-20T11:00:00Z',
      readerMode: 'offline-rule',
    },
  ],
  factory: [
    {
      id: 'ev-fac-en-resin',
      type: 'supplier_shutdown',
      hazardType: 'supplier_shutdown',
      target: 'fac-l2-resin',
      region: 'Dahej',
      lat: 21.7145,
      lng: 72.5782,
      severity: 0.8,
      durationDays: 16,
      expectedDurationDays: 16,
      confidence: 0.94,
      sourceKind: 'govt alert',
      sourceType: 'official_bulletin',
      sourceName: 'Gujarat Industrial Safety Notice',
      verifiedStatus: 'verified',
      language: 'en',
      sourceText:
        'Dahej Polymer Complex halted Nylon-66 resin compounding lines for 16 days due to a boiler safety inspection and steam line repair.',
      rawText:
        'Dahej Polymer Complex halted Nylon-66 resin compounding lines for 16 days due to a boiler safety inspection and steam line repair.',
      translation:
        'The Dahej resin plant stopped making Nylon-66 granules for 16 days to fix a boiler line.',
      plainSummary:
        'The Dahej resin plant stopped making Nylon-66 granules for 16 days to fix a boiler line.',
      title: 'Boiler shutdown at Dahej polymer resin plant',
      affectedKeywords: ['resin', 'polymer', 'nylon', 'granules', 'dahej', 'supplier_shutdown'],
      publishedAt: '2026-11-20T06:45:00Z',
      readerMode: 'offline-rule',
    },
    {
      id: 'ev-fac-mr-strike',
      type: 'transport_strike',
      hazardType: 'transport_strike',
      target: 'Pune',
      region: 'Pune',
      lat: 18.7606,
      lng: 73.8636,
      severity: 0.7,
      durationDays: 14,
      expectedDurationDays: 14,
      confidence: 0.86,
      sourceKind: 'news',
      sourceType: 'local_news',
      sourceName: 'Pune Industrial Times',
      verifiedStatus: 'verified',
      language: 'mr',
      sourceText:
        'पुणे चाकण औद्योगिक क्षेत्रात कामगारांच्या संपामुळे अॅल्युमिनियम कास्टिंगची वाहतूक ठप्प झाली आहे.',
      rawText:
        'पुणे चाकण औद्योगिक क्षेत्रात कामगारांच्या संपामुळे अॅल्युमिनियम कास्टिंगची वाहतूक ठप्प झाली आहे.',
      translation:
        'A worker strike in Pune Chakan industrial zone is slowing raw aluminium casting deliveries.',
      plainSummary:
        'A worker strike in Pune Chakan industrial zone is slowing raw aluminium casting deliveries.',
      title: 'Chakan foundry strike slows aluminium castings',
      affectedKeywords: ['foundry', 'aluminium', 'casting', 'pune', 'chakan', 'transport_strike'],
      publishedAt: '2026-11-20T08:20:00Z',
      readerMode: 'offline-rule',
    },
    {
      id: 'ev-fac-rumour-cyber',
      type: 'cyber_attack',
      hazardType: 'cyber_attack',
      target: 'fac-l3-cracker',
      region: 'Jamnagar',
      lat: 22.4707,
      lng: 70.0577,
      severity: 0.9,
      durationDays: 22,
      expectedDurationDays: 22,
      confidence: 0.3,
      sourceKind: 'forward',
      sourceType: 'whatsapp_forward',
      sourceName: 'Forwarded Trade Chat',
      verifiedStatus: 'unverified',
      language: 'en',
      sourceText:
        'Forwarded message: Someone told that Jamnagar petrochemical plant hit by cyber attack and stopped all monomer dispatches!',
      rawText:
        'Forwarded message: Someone told that Jamnagar petrochemical plant hit by cyber attack and stopped all monomer dispatches!',
      translation:
        'An unconfirmed forward claims a cyber attack stopped Jamnagar monomer shipments. No official notice exists.',
      plainSummary:
        'An unconfirmed forward claims a cyber attack stopped Jamnagar monomer shipments. No official notice exists.',
      title: 'Unverified forward claims cyber attack at Jamnagar cracker',
      affectedKeywords: ['petrochemical', 'monomer', 'resin', 'jamnagar', 'cyber_attack'],
      publishedAt: '2026-11-20T11:30:00Z',
      readerMode: 'offline-rule',
    },
  ],
};

export interface QuickTestSnippet {
  id: string;
  languageLabel: string;
  languageCode: TroubleEvent['language'];
  riskTag: string;
  sourceType: TroubleEvent['sourceType'];
  text: string;
  englishFallback: string;
}

export const MULTILINGUAL_TEST_SNIPPETS: QuickTestSnippet[] = [
  {
    id: 'snip-ta-flood',
    languageLabel: 'Tamil',
    languageCode: 'ta',
    riskTag: 'Flood · 3 weeks',
    sourceType: 'local_news',
    text: 'தூத்துக்குடி மாவட்டத்தில் தொடர் கனமழை மற்றும் வெள்ளம் காரணமாக துறைமுகம் மற்றும் ஆலைகள் சுமார் மூன்று வாரம் மூடப்பட்டுள்ளன.',
    englishFallback:
      'Continuous heavy rain and flooding in Thoothukudi has closed the port and factories for about three weeks (21 days).',
  },
  {
    id: 'snip-ta-govt-milk',
    languageLabel: 'Tamil',
    languageCode: 'ta',
    riskTag: 'Govt notice · Heatwave & milk',
    sourceType: 'official_bulletin',
    text: 'தமிழ்நாடு பால்வளத் துறை அறிவிப்பு: வேலூர் மற்றும் ஈரோடு பகுதியில் கடும் வெப்ப அலை காரணமாக பால் உற்பத்தி குறைந்து தீவனத் தட்டுப்பாடு ஏற்பட்டுள்ளது.',
    englishFallback:
      'Tamil Nadu Dairy Department official notice: Severe heatwave in Vellore and Erode has cut milk yield and created a cattle-feed shortage.',
  },
  {
    id: 'snip-ta-fwd-gas',
    languageLabel: 'Tamil',
    languageCode: 'ta',
    riskTag: 'WhatsApp forward · Gas',
    sourceType: 'whatsapp_forward',
    text: 'அனுப்பப்பட்டது (WhatsApp வதந்தி): எண்ணூர் எரிவாயு நிரப்பும் நிலையத்தில் சிலிண்டர் தட்டுப்பாடு ஏற்பட்டுள்ளதால் 14 நாட்கள் சமையல் எரிவாயு வராது என செய்தி பரவுகிறது.',
    englishFallback:
      'Unverified WhatsApp forward claims Ennore gas bottling plant faces a cylinder shortage and commercial LPG will stop for 14 days.',
  },
  {
    id: 'snip-hi-strike',
    languageLabel: 'Hindi',
    languageCode: 'hi',
    riskTag: 'Truckers strike',
    sourceType: 'local_news',
    text: 'कोल्हापुर चीनी मिलों के बाहर ट्रांसपोर्ट यूनियन की ट्रक हड़ताल से चीनी के ट्रकों की आवाजाही 15 दिन के लिए रुक गई है।',
    englishFallback:
      'A lorry strike by transport unions outside Kolhapur sugar mills has halted sugar truck dispatches for 15 days.',
  },
  {
    id: 'snip-hi-govt-ban',
    languageLabel: 'Hindi',
    languageCode: 'hi',
    riskTag: 'Govt notice · Export ban',
    sourceType: 'official_bulletin',
    text: 'सरकारी अधिसूचना: घरेलू किल्लत रोकने के लिए सरकार ने अगले 18 दिन तक चीनी और इस्पात के निर्यात पर तत्काल प्रतिबंध लगा दिया है।',
    englishFallback:
      'Official government notice: To stop domestic shortages, exports of sugar and steel alloys are banned for the next 18 days.',
  },
  {
    id: 'snip-te-price',
    languageLabel: 'Telugu',
    languageCode: 'te',
    riskTag: 'Price hike (+35%)',
    sourceType: 'mandi_notice',
    text: 'గుంటూరు మరియు విజయవాడ మార్కెట్లలో రవాణా ఖర్చు పెరగడంతో ప్యాకేజింగ్ పేపర్ మరియు ముడి సరుకుల ధరలు ఒక్కసారిగా 35% పెరిగాయి.',
    englishFallback:
      'Rising freight costs pushed packaging paper and raw supply wholesale prices up by 35% in Guntur and Vijayawada.',
  },
  {
    id: 'snip-kn-licence',
    languageLabel: 'Kannada',
    languageCode: 'kn',
    riskTag: 'Licence closure',
    sourceType: 'local_news',
    text: 'ಬೆಂಗಳೂರು ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶದಲ್ಲಿ ಸುರಕ್ಷತಾ ನಿಯಮ ಉಲ್ಲಂಘನೆ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ಸಿಎನ್‌ಸಿ ಘಟಕದ ಪರವಾನಗಿ 12 ದಿನ ರದ್ದುಗೊಳಿಸಿ ಮುಚ್ಚಲು ಆದೇಶಿಸಲಾಗಿದೆ.',
    englishFallback:
      'Safety inspectors suspended the operating licence of a Peenya CNC castings unit in Bengaluru for 12 days and ordered a closure.',
  },
  {
    id: 'snip-ml-port',
    languageLabel: 'Malayalam',
    languageCode: 'ml',
    riskTag: 'Port jam & strike',
    sourceType: 'local_news',
    text: 'കൊച്ചി തുറമുഖത്തെ ബെർത്ത് തിരക്കും തൊഴിലാളി സമരവും കാരണം ഇറക്കുമതി ചെയ്യുന്ന ഗ്യാസും പൾപ്പും 10 ദിവസം വൈകുന്നു.',
    englishFallback:
      'Port congestion and a dock worker strike at Kochi harbour are delaying imported gas and wood pulp deliveries by 10 days.',
  },
  {
    id: 'snip-bn-fire',
    languageLabel: 'Bengali',
    languageCode: 'bn',
    riskTag: 'Factory fire',
    sourceType: 'local_news',
    text: 'হাওড়া শিল্পাঞ্চলে ক্রাফট পেপার কারখানায় ভয়াবহ অগ্নিকাণ্ডের ফলে কার্টন বক্স উৎপাদন ১৪ দিন সম্পূর্ণ বন্ধ রয়েছে।',
    englishFallback:
      'A major factory fire at a kraft paper mill in Howrah has halted carton box production completely for 14 days.',
  },
  {
    id: 'snip-mr-fwd-cyber',
    languageLabel: 'Marathi',
    languageCode: 'mr',
    riskTag: 'WhatsApp forward · Cyber',
    sourceType: 'whatsapp_forward',
    text: 'फॉरवर्ड संदेश (अपुष्ट): पुणे चाकण आणि जामनगर येथील पुरवठादार कंपनीवर सायबर हल्ला झाल्याने संगणक प्रणाली 10 दिवस बंद असल्याची चर्चा आहे.',
    englishFallback:
      'Unverified WhatsApp forward claims a cyber attack locked billing computers at a Pune Chakan and Jamnagar supplier for 10 days.',
  },
  {
    id: 'snip-en-licence',
    languageLabel: 'English',
    languageCode: 'en',
    riskTag: 'Licence & safety closure',
    sourceType: 'local_news',
    text: 'Gujarat safety board issued a 16-day licence suspension and closure order for Dahej Polymer Resin Compounder over boiler inspection.',
    englishFallback:
      'Gujarat safety board issued a 16-day licence suspension and closure order for Dahej Polymer Resin Compounder over boiler inspection.',
  },
  {
    id: 'snip-en-blockade',
    languageLabel: 'English',
    languageCode: 'en',
    riskTag: 'Road block & fuel hike',
    sourceType: 'local_news',
    text: 'Highway blockade near Hosur stalls steel bolt lorries for 8 days while diesel surcharge jumps 25% across Tamil Nadu routes.',
    englishFallback:
      'Highway blockade near Hosur stalls steel bolt lorries for 8 days while diesel surcharge jumps 25% across Tamil Nadu routes.',
  },
];

