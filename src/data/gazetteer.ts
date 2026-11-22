export interface GeoPlace {
  name: string;
  aliases: string[];
  state: string;
  lat: number;
  lng: number;
}

/**
 * Gazetteer covering every city in shop.ts and factory.ts with aliases in
 * English, Tamil, Hindi/Marathi, Telugu, Kannada, Malayalam, and Bengali.
 */
export const INDIA_GAZETTEER: GeoPlace[] = [
  {
    name: 'Chennai',
    aliases: ['chennai', 'madras', 'ennore', 't nagar', 'சென்னை', 'चेन्नई', 'చెన్నై', 'ಚೆನ್ನೈ', 'ചെന്നൈ', 'চেন্নাই'],
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
  },
  {
    name: 'Vellore',
    aliases: ['vellore', 'ranipet', 'வேலூர்', 'वेल्लोर', 'वेल्लूर', 'వెల్లూరు', 'ವೆಲ್ಲೂರು', 'വെല്ലൂർ', 'ভেলোর'],
    state: 'Tamil Nadu',
    lat: 12.9165,
    lng: 79.1325,
  },
  {
    name: 'Erode',
    aliases: ['erode', 'ஈரோடு', 'इरोड', 'ईरोड', 'ఈరోడ్', 'ಈರೋಡ್', 'ഈറോഡ്', 'ইরোড'],
    state: 'Tamil Nadu',
    lat: 11.341,
    lng: 77.7172,
  },
  {
    name: 'Coimbatore',
    aliases: ['coimbatore', 'kovai', 'tirupur', 'கோவை', 'கோயம்புத்தூர்', 'कोयंबटूर', 'कोइम्बतूर', 'కోయంబత్తూరు', 'ಕೊಯಮತ್ತೂರು', 'കോയമ്പത്തൂർ', 'কোয়েম্বাটুর'],
    state: 'Tamil Nadu',
    lat: 11.0168,
    lng: 76.9558,
  },
  {
    name: 'Coonoor',
    aliases: ['coonoor', 'nilgiris', 'ooty', 'குன்னூர்', 'நீலகிரி', 'कुन्नूर', 'नीलगिरि', 'కూనూర్', 'ಕೂನೂರು', 'കൂന്നൂർ', 'কুনুর'],
    state: 'Tamil Nadu',
    lat: 11.353,
    lng: 76.7959,
  },
  {
    name: 'Hosur',
    aliases: ['hosur', 'krishnagiri', 'sipcot', 'ஓசூர்', 'होसूर', 'హోసూర్', 'ಹೊಸೂರು', 'ഹൊസൂർ', 'হোসুর'],
    state: 'Tamil Nadu',
    lat: 12.7409,
    lng: 77.8253,
  },
  {
    name: 'Salem',
    aliases: ['salem', 'சேலம்', 'सलेम', 'सेलम', 'సేలం', 'ಸೇಲಂ', 'സേലം', 'সালেম'],
    state: 'Tamil Nadu',
    lat: 11.6643,
    lng: 78.146,
  },
  {
    name: 'Sriperumbudur',
    aliases: ['sriperumbudur', 'oragadam', 'kanchipuram', 'ஸ்ரீபெரும்புதூர்', 'श्रीपेरंबदूर', 'శ్రీపెరంబుదూర్', 'ಶ್ರೀಪೆರಂಬುದೂರ್', 'ശ്രീപെരുമ്പുതൂർ', 'শ্রীপেরুম্বুদুর'],
    state: 'Tamil Nadu',
    lat: 12.9675,
    lng: 79.9419,
  },
  {
    name: 'Tuticorin',
    aliases: ['tuticorin', 'thoothukudi', 'thoothukkudi', 'தூத்துக்குடி', 'तूतीकोरिन', 'తూత్తుకుడి', 'ತೂತ್ತುಕುಡಿ', 'തൂത്തുക്കുടി', 'তুতিকোরিন'],
    state: 'Tamil Nadu',
    lat: 8.7642,
    lng: 78.1348,
  },
  {
    name: 'Madurai',
    aliases: ['madurai', 'மதுரை', 'मदुरै', 'మదురై', 'ಮದುರೈ', 'മധുര', 'মাদুরাই'],
    state: 'Tamil Nadu',
    lat: 9.9252,
    lng: 78.1198,
  },
  {
    name: 'Bengaluru',
    aliases: ['bengaluru', 'bangalore', 'peenya', 'பெங்களூரு', 'बेंगलुरु', 'బెంగళూరు', 'ಬೆಂಗಳೂರು', 'ബെംഗളൂരു', 'বেঙ্গালুরু'],
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    name: 'Mandya',
    aliases: ['mandya', 'mysuru', 'mysore', 'மண்டியா', 'मंड्या', 'మాండ్య', 'ಮಂಡ್ಯ', 'മാണ്ഡ്യ', 'মান্ডিয়া'],
    state: 'Karnataka',
    lat: 12.5218,
    lng: 76.8951,
  },
  {
    name: 'Mangalore',
    aliases: ['mangalore', 'mangaluru', 'மங்களூரு', 'मंगलुरु', 'మంగళూరు', 'ಮಂಗಳೂರು', 'മംഗളൂരു', 'ম্যাঙ্গালোর'],
    state: 'Karnataka',
    lat: 12.9141,
    lng: 74.856,
  },
  {
    name: 'Pune',
    aliases: ['pune', 'chakan', 'pimpri', 'புனே', 'पुणे', 'पुने', 'పుణె', 'ಪುಣೆ', 'പൂനെ', 'পুনে'],
    state: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
  },
  {
    name: 'Kolhapur',
    aliases: ['kolhapur', 'sangli', 'கோலாப்பூர்', 'कोल्हापुर', 'कोल्हापूर', 'కొల్హాపూర్', 'ಕೊಲ್ಹಾಪುರ', 'കോലാപൂർ', 'কোলাপুর'],
    state: 'Maharashtra',
    lat: 16.705,
    lng: 74.2433,
  },
  {
    name: 'Mumbai',
    aliases: ['mumbai', 'nhava sheva', 'jnpt', 'thane', 'மும்பை', 'मुंबई', 'ముంబై', 'ಮುಂಬೈ', 'മുംബൈ', 'মুম্বাই'],
    state: 'Maharashtra',
    lat: 19.076,
    lng: 72.8777,
  },
  {
    name: 'Dahej',
    aliases: ['dahej', 'bharuch', 'vadodara', 'gujarat', 'தஹேஜ்', 'दहेज', 'దహేజ్', 'ದಹೇಜ್', 'ദഹേജ്', 'দহেজ'],
    state: 'Gujarat',
    lat: 21.7145,
    lng: 72.5782,
  },
  {
    name: 'Jamnagar',
    aliases: ['jamnagar', 'kandla', 'mundra', 'ஜாம்நகர்', 'जामनगर', 'జామ్‌నగర్', 'ಜಾಮ್‌ನಗರ', 'ജാംനഗർ', 'জামনগর'],
    state: 'Gujarat',
    lat: 22.4707,
    lng: 70.0577,
  },
  {
    name: 'Guntur',
    aliases: ['guntur', 'vijayawada', 'andhra', 'குண்டூர்', 'गुंटूर', 'గుంటూరు', 'గుంటూరు', 'ಗುಂಟೂರು', 'ഗുണ്ടൂർ', 'গুন্টুর'],
    state: 'Andhra Pradesh',
    lat: 16.3067,
    lng: 80.4365,
  },
  {
    name: 'Hyderabad',
    aliases: ['hyderabad', 'telangana', 'ஹைதராபாத்', 'हैदराबाद', 'హైదరాబాద్', 'ಹೈದರಾಬಾದ್', 'ഹൈദരാബാദ്', 'হায়দ্রাবাদ'],
    state: 'Telangana',
    lat: 17.385,
    lng: 78.4867,
  },
  {
    name: 'Kochi',
    aliases: ['kochi', 'ernakulam', 'kottayam', 'kerala', 'கொச்சி', 'कोच्चि', 'కొచ్చి', 'ಕೊಚ್ಚಿ', 'കൊച്ചി', 'কোচি'],
    state: 'Kerala',
    lat: 9.9312,
    lng: 76.2673,
  },
  {
    name: 'Kolkata',
    aliases: ['kolkata', 'howrah', 'haldia', 'கொல்கத்தா', 'ஹவுரா', 'कोलकाता', 'हावड़ा', 'కోల్‌కతా', 'ಕೋಲ್ಕತ್ತಾ', 'കൊൽക്കത്ത', 'কলকাতা', 'হাওড়া'],
    state: 'West Bengal',
    lat: 22.5726,
    lng: 88.3639,
  },
  {
    name: 'Joda',
    aliases: ['joda', 'keonjhar', 'odisha', 'ஜோடா', 'जोड़ा', 'ओडिशा', 'జోడా', 'ಜೋಡಾ', 'ജോഡ', 'জোডা'],
    state: 'Odisha',
    lat: 22.0125,
    lng: 85.4292,
  },
  {
    name: 'Koraput',
    aliases: ['koraput', 'damanjodi', 'கோராபுட்', 'कोरापुट', 'కోరాపుట్', 'ಕೋರಾಪುಟ್', 'കോരാപുട്ട്', 'কোরাপুট'],
    state: 'Odisha',
    lat: 18.8135,
    lng: 82.7123,
  },
  {
    name: 'Delhi',
    aliases: ['delhi', 'ncr', 'noida', 'டெல்லி', 'दिल्ली', 'ఢిల్లీ', 'ದೆಹಲಿ', 'ഡൽഹി', 'দিল্লি'],
    state: 'Delhi NCR',
    lat: 28.6139,
    lng: 77.209,
  },
  {
    name: 'Visakhapatnam',
    aliases: ['visakhapatnam', 'vizag', 'விசாகப்பட்டினம்', 'विशाखापत्तनम', 'విశాఖపట్నం'],
    state: 'Andhra Pradesh',
    lat: 17.6868,
    lng: 83.2185,
  },
  {
    name: 'Tiruchirappalli',
    aliases: ['tiruchirappalli', 'trichy', 'திருச்சி', 'तिरुचिरापल्ली'],
    state: 'Tamil Nadu',
    lat: 10.7905,
    lng: 78.7047,
  },
  {
    name: 'Thanjavur',
    aliases: ['thanjavur', 'tanjore', 'தஞ்சாவூர்', 'तंजावुर'],
    state: 'Tamil Nadu',
    lat: 10.787,
    lng: 79.1378,
  },
  {
    name: 'Tiruppur',
    aliases: ['tiruppur', 'திருப்பூர்', 'तिरुपुर'],
    state: 'Tamil Nadu',
    lat: 11.1085,
    lng: 77.3411,
  },
  {
    name: 'Ahmedabad',
    aliases: ['ahmedabad', 'अहमदाबाद', 'அகமதாபாத்'],
    state: 'Gujarat',
    lat: 23.0225,
    lng: 72.5714,
  },
  {
    name: 'Surat',
    aliases: ['surat', 'hazira', 'सूरत', 'சூரத்'],
    state: 'Gujarat',
    lat: 21.1702,
    lng: 72.8311,
  },
  {
    name: 'Nagpur',
    aliases: ['nagpur', 'नागपुर', 'நாக்பூர்'],
    state: 'Maharashtra',
    lat: 21.1458,
    lng: 79.0882,
  },
  {
    name: 'Nashik',
    aliases: ['nashik', 'नाशिक', 'நாசிக்'],
    state: 'Maharashtra',
    lat: 19.9975,
    lng: 73.7898,
  },
  {
    name: 'Jaipur',
    aliases: ['jaipur', 'जयपुर', 'ஜெய்ப்பூர்'],
    state: 'Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
  },
  {
    name: 'Indore',
    aliases: ['indore', 'इंदौर', 'இந்தூர்'],
    state: 'Madhya Pradesh',
    lat: 22.7196,
    lng: 75.8577,
  },
  {
    name: 'Lucknow',
    aliases: ['lucknow', 'लखनऊ', 'லக்னோ'],
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
  },
  {
    name: 'Patna',
    aliases: ['patna', 'पटना', 'பாட்னா'],
    state: 'Bihar',
    lat: 25.5941,
    lng: 85.1376,
  },
  {
    name: 'Bhubaneswar',
    aliases: ['bhubaneswar', 'भुवनेश्वर', 'புவனேஸ்வர்'],
    state: 'Odisha',
    lat: 20.2961,
    lng: 85.8245,
  },
  {
    name: 'Guwahati',
    aliases: ['guwahati', 'गुवाहाटी', 'குவஹாத்தி'],
    state: 'Assam',
    lat: 26.1445,
    lng: 91.7362,
  },
  {
    name: 'Chandigarh',
    aliases: ['chandigarh', 'चंडीगढ़', 'சண்டிகர்'],
    state: 'Chandigarh',
    lat: 30.7333,
    lng: 76.7794,
  },
  {
    name: 'Ludhiana',
    aliases: ['ludhiana', 'लुधियाना', 'லூதியானா'],
    state: 'Punjab',
    lat: 30.901,
    lng: 75.8573,
  },
];

export function matchPlaceInText(text: string): GeoPlace | null {
  const lower = text.toLowerCase();
  for (const place of INDIA_GAZETTEER) {
    for (const alias of place.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return place;
      }
    }
  }
  return null;
}

export function getPlaceByCity(city: string): GeoPlace | null {
  const lower = city.trim().toLowerCase();
  return (
    INDIA_GAZETTEER.find(
      (p) =>
        p.name.toLowerCase() === lower ||
        p.aliases.some((a) => a.toLowerCase() === lower),
    ) ?? null
  );
}

/**
 * Simplified [lat, lng] outline of India's peninsula and major industrial hubs
 * for the interactive Shock Test map picker.
 */
export const SOUTH_WEST_INDIA_OUTLINE: Array<[number, number]> = [
  [23.8, 68.7], // Kutch west
  [22.3, 69.0], // Dwarka
  [20.7, 70.9], // Diu
  [21.6, 72.5], // Bharuch / Dahej coast
  [19.1, 72.8], // Mumbai
  [16.9, 73.3], // Ratnagiri
  [15.4, 73.8], // Goa
  [12.9, 74.8], // Mangalore
  [11.2, 75.8], // Kozhikode
  [9.9, 76.2],  // Kochi
  [8.1, 77.5],  // Kanyakumari
  [8.8, 78.2],  // Tuticorin
  [10.3, 79.8], // Nagapattinam
  [13.1, 80.3], // Chennai
  [15.8, 80.9], // Krishna delta
  [17.7, 83.3], // Visakhapatnam
  [19.8, 85.8], // Puri
  [21.6, 87.5], // Digha
  [22.5, 88.4], // Kolkata
  [24.9, 87.8], // Jharkhand / WB border
  [26.5, 84.0], // Bihar / UP
  [28.7, 77.2], // Delhi NCR
  [27.0, 72.8], // Rajasthan
  [24.5, 71.0], // North Gujarat
];

/**
 * Simplified clockwise GeoJSON outline of India ([lng, lat]) for d3-geoMercator + d3.geoPath.
 */
export const INDIA_OUTLINE_GEOJSON = {
  type: 'Feature' as const,
  properties: { name: 'India' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [68.2, 23.7],
        [70.2, 24.7],
        [70.6, 27.2],
        [73.8, 30.2],
        [74.5, 32.4],
        [73.8, 33.4],
        [74.0, 35.0],
        [76.8, 35.6],
        [79.5, 34.2],
        [78.9, 32.3],
        [79.5, 30.8],
        [81.0, 28.5],
        [84.5, 27.4],
        [87.9, 26.6],
        [88.6, 27.9],
        [92.0, 27.9],
        [94.5, 29.1],
        [97.3, 28.1],
        [95.4, 26.8],
        [94.6, 24.4],
        [92.7, 22.0],
        [92.9, 24.7],
        [91.7, 25.2],
        [89.9, 26.2],
        [88.6, 24.5],
        [88.8, 22.0],
        [87.5, 21.6],
        [85.8, 19.8],
        [83.3, 17.7],
        [80.9, 15.8],
        [80.3, 13.1],
        [79.8, 10.3],
        [78.2, 8.8],
        [77.5, 8.1],
        [76.2, 10.0],
        [74.8, 12.9],
        [73.8, 15.4],
        [73.3, 17.0],
        [72.8, 19.1],
        [72.6, 21.7],
        [70.4, 20.9],
        [69.0, 22.3],
        [68.2, 23.7],
      ],
    ],
  },
};


