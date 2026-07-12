/* FirstStep — venue category classifier
   Infers a category from OSM tags AND from the venue name text,
   with a confidence score (high / medium / low). */

export const CATEGORY = {
  CAFE: 'cafe',
  RESTAURANT: 'restaurant',
  BAR: 'bar',
  PUB: 'pub',
  BEAUTY: 'beauty',
  FITNESS: 'fitness',
  HEALTH: 'health',
  SHOP: 'shop',
  BEACH: 'beach',
  HOTEL: 'hotel',
  MALL: 'mall',
  ENTERTAINMENT: 'entertainment',
  CULTURE: 'culture',
  TRANSPORT: 'transport',
  UNKNOWN: 'unknown',
};

export const CATEGORY_LABEL = {
  [CATEGORY.CAFE]: 'Kafe',
  [CATEGORY.RESTAURANT]: 'Restoran',
  [CATEGORY.BAR]: 'Bar',
  [CATEGORY.PUB]: 'Pub',
  [CATEGORY.BEAUTY]: 'Kuaför / Güzellik',
  [CATEGORY.FITNESS]: 'Spor Salonu',
  [CATEGORY.HEALTH]: 'Sağlık',
  [CATEGORY.SHOP]: 'Market / Mağaza',
  [CATEGORY.BEACH]: 'Plaj',
  [CATEGORY.HOTEL]: 'Otel',
  [CATEGORY.MALL]: 'Alışveriş Merkezi',
  [CATEGORY.ENTERTAINMENT]: 'Eğlence',
  [CATEGORY.CULTURE]: 'Kültür',
  [CATEGORY.TRANSPORT]: 'Ulaşım',
  [CATEGORY.UNKNOWN]: 'Tür bilinmiyor',
};

/* --- Strong signal: OSM tag values --- */
const TAG_MAP = {
  // amenity
  cafe: CATEGORY.CAFE,
  restaurant: CATEGORY.RESTAURANT,
  fast_food: CATEGORY.RESTAURANT,
  food_court: CATEGORY.RESTAURANT,
  bar: CATEGORY.BAR,
  pub: CATEGORY.PUB,
  biergarten: CATEGORY.PUB,
  nightclub: CATEGORY.BAR,
  gym: CATEGORY.FITNESS,
  fitness_centre: CATEGORY.FITNESS,
  clinic: CATEGORY.HEALTH,
  hospital: CATEGORY.HEALTH,
  pharmacy: CATEGORY.HEALTH,
  dentist: CATEGORY.HEALTH,
  doctors: CATEGORY.HEALTH,
  cinema: CATEGORY.ENTERTAINMENT,
  theatre: CATEGORY.ENTERTAINMENT,
  arts_centre: CATEGORY.CULTURE,
  marketplace: CATEGORY.SHOP,
  bus_station: CATEGORY.TRANSPORT,
  ferry_terminal: CATEGORY.TRANSPORT,
  // shop
  supermarket: CATEGORY.SHOP,
  convenience: CATEGORY.SHOP,
  mall: CATEGORY.MALL,
  department_store: CATEGORY.MALL,
  hairdresser: CATEGORY.BEAUTY,
  beauty: CATEGORY.BEAUTY,
  // leisure
  fitness_centre_leisure: CATEGORY.FITNESS,
  sports_centre: CATEGORY.FITNESS,
  // tourism
  hotel: CATEGORY.HOTEL,
  motel: CATEGORY.HOTEL,
  guest_house: CATEGORY.HOTEL,
  resort: CATEGORY.HOTEL,
  museum: CATEGORY.CULTURE,
  gallery: CATEGORY.CULTURE,
  attraction: CATEGORY.ENTERTAINMENT,
  beach_resort: CATEGORY.BEACH,
  // natural / leisure beach
  beach: CATEGORY.BEACH,
  // aeroway / railway
  aerodrome: CATEGORY.TRANSPORT,
  terminal: CATEGORY.TRANSPORT,
  station: CATEGORY.TRANSPORT,
  halt: CATEGORY.TRANSPORT,
  subway_entrance: CATEGORY.TRANSPORT,
};

/* --- Weaker signal: keyword found inside the venue name text ---
   Each entry: [regex, category]. Order matters — more specific first. */
const NAME_KEYWORDS = [
  // beach (before generic terms)
  [/\b(beach|plaj|sahil)\b/i, CATEGORY.BEACH],

  // transport
  [/\b(airport|terminal|station|istasyon|havaliman[ıi]|otogar|iskele|ferry)\b/i, CATEGORY.TRANSPORT],

  // hotel
  [/\b(hotel|otel|resort|hostel|inn|suites?)\b/i, CATEGORY.HOTEL],

  // mall
  [/\b(mall|centre|center|avm|plaza)\b/i, CATEGORY.MALL],

  // entertainment / culture
  [/\b(cinema|sinema|theatre|theater|tiyatro)\b/i, CATEGORY.ENTERTAINMENT],
  [/\b(museum|m[üu]ze|gallery|galeri)\b/i, CATEGORY.CULTURE],

  // health
  [/\b(clinic|klinik|pharmacy|eczane|dental|dent|hospital|hastane|medical)\b/i, CATEGORY.HEALTH],

  // fitness
  [/\b(gym|fitness|crossfit|spor\s?salonu)\b/i, CATEGORY.FITNESS],

  // beauty / hair
  [/\b(salon|salonu|coiffure|hairdresser|barber|berber|kuaf[öo]r|beauty|g[üu]zellik|nails?)\b/i, CATEGORY.BEAUTY],

  // shop / convenience
  [/\b(market|mart|mini\s?market|bakkal|store|ma[ğg]aza|eleven|shop|s[üu]permarket)\b/i, CATEGORY.SHOP],

  // pub (before bar, since "pub" often stands alone)
  [/\bpub\b/i, CATEGORY.PUB],

  // bar
  [/\bbar\b/i, CATEGORY.BAR],

  // cafe / coffee
  [/\b(cafe|café|kafe|coffee|roaster|roastery|espresso)\b/i, CATEGORY.CAFE],

  // restaurant
  [/\b(restaurant|restoran|restauran|grill|kitchen|bistro|steakhouse|trattoria|brasserie|eatery|lokanta)\b/i, CATEGORY.RESTAURANT],
];

/**
 * Classify a venue from its raw OSM tags object and its display name.
 * Returns { category, confidence: 'high'|'medium'|'low', reason }
 */
export function classifyVenue(tags, name) {
  const t = tags || {};
  const nameText = name || '';

  // 1. Strong signal: direct OSM tag match
  for (const key of ['amenity', 'shop', 'leisure', 'tourism', 'aeroway', 'railway', 'natural']) {
    const val = t[key];
    if (val && TAG_MAP[val]) {
      return {
        category: TAG_MAP[val],
        confidence: 'high',
        reason: `OSM etiketi: ${key}=${val}`,
      };
    }
  }

  // 2. Medium/strong signal: keyword in venue name
  for (const [regex, category] of NAME_KEYWORDS) {
    if (regex.test(nameText)) {
      return {
        category,
        confidence: t && Object.keys(t).length ? 'medium' : 'medium',
        reason: `İsimde geçen anahtar kelime: "${nameText.match(regex)[0]}"`,
      };
    }
  }

  // 3. Nothing matched
  return {
    category: CATEGORY.UNKNOWN,
    confidence: 'low',
    reason: 'Yeterli veri yok',
  };
}
