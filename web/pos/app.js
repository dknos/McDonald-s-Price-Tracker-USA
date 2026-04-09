/* ═══════════════════════════════════════════════════════════════════════
   McDonald's POS Price Finder
   ═══════════════════════════════════════════════════════════════════════ */

// ─── State ───
let allStates = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho',
  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine',
  'Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri',
  'Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
  'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee',
  'Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
];
let stores = [];
let itemNames = [];
let priceMatrix = {};
let nearbyStores = [];
let cart = [];
let activeCat = 'All';
let userLat = null, userLon = null;
let currentState = null;
let mergedItems = [];
let chartState = null;        // state loaded for chart
let chartStores = [];         // stores shown in chart (all or ZIP-filtered)
let chartZipGeo = null;       // {lat, lon} if chart is ZIP-filtered

// ─── Promo / Deal Detection ───
const PROMO_PATTERNS = [
  /\bmeal deal\b/i,
  /\bbundle\b/i,
  /\bpack\b/i,
  /\bfamily\b/i,
  /\bshare(?:able)?\b/i,
  /\b2\s*(?:for|x)\b/i,
  /\b\$\d/,
  /\bfree\b/i,
  /\bbogo\b/i,
  /\breward/i,
  /\bbirthday\s*party\b/i,
  /\bcollector/i,
];

const DEAL_KEYWORDS = /meal deal|bundle|shareable|2 for|2x|family pack|classic pack|bundle box/i;

function getItemBadge(name) {
  const lower = name.toLowerCase();
  if (DEAL_KEYWORDS.test(lower)) return 'deal';
  for (const pat of PROMO_PATTERNS) {
    if (pat.test(name)) return 'promo';
  }
  return null;
}

// ─── Product Image Map ───
const IMG_MAP = {
  'big mac':            'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_BigMac_1564x1564',
  'quarter pounder with cheese': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_QuarterPounderwithCheese_1564x1564',
  'quarter pounder hamburger': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_QuarterPounderWithCheese_1564x1564',
  'double quarter pounder with cheese': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-004_DoubleQuarterPounderwithCheese_1564x1564',
  'mcdouble':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_McDouble_1564x1564',
  'hamburger':          'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_Hamburger_1564x1564',
  'cheeseburger':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_Cheeseburger_1564x1564',
  'double cheeseburger':'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_DoubleCheeseburger_1564x1564',
  'mcrib':              'https://s7d1.scene7.com/is/image/mcdonalds/DC_202211_0085_McRib_1564x1564',
  'filet-o-fish':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_FiletOFish_1564x1564',
  'mccrispy':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_McCrispy_1564x1564',
  'spicy mccrispy':     'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_SpicyMcCrispy_1564x1564',
  'deluxe mccrispy':    'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_DeluxeMcCrispy_1564x1564',
  'mcchicken':          'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_McChicken_1564x1564',
  '10 pc. chicken mcnuggets': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_6000-999_10McNuggets_1564x1564',
  '20 pc. chicken mcnuggets': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_6000-999_20McNuggets_1564x1564',
  '40 pc. chicken mcnuggets': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_6000-999_40McNuggets_1564x1564',
  '6 pc. chicken mcnuggets':  'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_6000-999_6McNuggets_1564x1564',
  '4 pc. chicken mcnuggets':  'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_6000-999_4McNuggets_1564x1564',
  'egg mcmuffin':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_EggMcMuffin_1564x1564',
  'sausage mcmuffin':   'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SausageMcMuffin_1564x1564',
  'sausage mcmuffin with egg': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SausageMcMuffinWithEgg_1564x1564',
  'hotcakes':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_Hotcakes_1564x1564',
  'hotcakes and sausage':'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_HotcakesandSausage_1564x1564',
  'hash browns':        'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_HashBrowns_1564x1564',
  'sausage biscuit':    'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SausageBiscuit_1564x1564',
  'bacon egg cheese biscuit': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_BaconEggCheeseBiscuit_1564x1564',
  'sausage egg cheese biscuit': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SausageEggCheeseBiscuit_1564x1564',
  'big breakfast':      'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_BigBreakfast_1564x1564',
  'sausage mcgriddles': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SausageMcGriddles_1564x1564',
  'french fries':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumFrenchFries_1564x1564',
  'small french fries': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SmallFrenchFries_1564x1564',
  'medium french fries':'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumFrenchFries_1564x1564',
  'large french fries': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_LargeFrenchFries_1564x1564',
  'apple slices':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_AppleSlices_1564x1564',
  'hot fudge sundae':   'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_HotFudgeSundae_1564x1564',
  'caramel sundae':     'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_CaramelSundae_1564x1564',
  'vanilla cone':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_VanillaCone_1564x1564',
  'mcflurry with oreo': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_McFlurryOREO_1564x1564',
  'mcflurry with m&m':  'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_McFlurryMMS_1564x1564',
  'baked apple pie':    'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_BakedApplePie_1564x1564',
  'chocolate shake':    'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumChocolateShake_1564x1564',
  'vanilla shake':      'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumVanillaShake_1564x1564',
  'strawberry shake':   'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumStrawberryShake_1564x1564',
  'chocolate chip cookie': 'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_ChocolateChipCookie_1564x1564',
  'coca-cola':          'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumCocaCola_1564x1564',
  'sprite':             'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumSprite_1564x1564',
  'dr pepper':          'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumDrPepper_1564x1564',
  'sweet tea':          'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumSweetTea_1564x1564',
  'iced tea':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumUnsweetIcedTea_1564x1564',
  'premium roast coffee':'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SmallPremiumRoastCoffee_1564x1564',
  'iced coffee':        'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumIcedCoffee_1564x1564',
  'latte':              'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumLatte_1564x1564',
  'frappe':             'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumMochaFrappe_1564x1564',
  'happy meal':         'https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_HappyMeal_1564x1564',
  'lemonade':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumLemonade_1564x1564',
  'orange juice':       'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_SmallOrangeJuice_1564x1564',
  'hi-c':               'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumHiCOranageLavaBurst_1564x1564',
  'fanta':              'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumFantaOrange_1564x1564',
  'milk':               'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_1LowFatMilkJug_1564x1564',
  'smoothie':           'https://s7d1.scene7.com/is/image/mcdonalds/DC_202201_0007-005_MediumMangoSmoothie_1564x1564',
};

function getItemImage(name) {
  const lower = name.toLowerCase().replace(/[®™]/g, '');
  for (const [key, url] of Object.entries(IMG_MAP)) {
    if (lower === key) return url;
  }
  let bestKey = '', bestUrl = '';
  for (const [key, url] of Object.entries(IMG_MAP)) {
    if (lower.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      bestUrl = url;
    }
  }
  return bestUrl || null;
}

// ─── Junk / Non-Food Item Blacklist ───
const JUNK_PATTERNS = [
  /\bdeposit\b/i, /\bhosting fee\b/i, /\bflat fee\b/i, /\brmh\s*donation\b/i,
  /\btreat book\b/i, /\busa today\b/i, /\bthermos\b/i, /\bpaper cup\b/i,
  /\bblitz box\b/i, /\bparty\s*-?\s*extra\s*child\b/i, /\bbirthday party\b/i,
  /\bbottle deposit\b/i, /\bdonation\b/i, /\bcoupon\b/i, /\bgift\s*card\b/i,
  /\bcarrier\b/i, /\btray\b/i,
];
const MAX_PRICE_CENTS = 9899;   // $98.99 — anything ≥$99 is placeholder junk
const MIN_STORE_COUNT = 3;      // items at fewer stores are noise

function isJunkItem(name) {
  return JUNK_PATTERNS.some(pat => pat.test(name));
}

// ─── Item Name Normalization & Dedup ───
function dedupeKey(name) {
  let s = name.toLowerCase().replace(/[®™©]/g, '').replace(/\s+/g, ' ').trim();

  // Strip leading quantity prefix ("2 Double Cheeseburger" → "Double Cheeseburger")
  // Bundle prices are handled by the IQR outlier filter in buildMergedItems.
  // Keep quantity for items that are distinct products (meals, strips, packs, pies, wraps, fries, bacon).
  const qtyMatch = s.match(/^(\d+)\s*x?\s+(.+)/);
  if (qtyMatch && parseInt(qtyMatch[1]) <= 3) {
    const rest = qtyMatch[2];
    const keepAsIs = /meal|strip|pack|pie|cookie|wrap|burrito|bundle|bacon|fry|fries|piece/.test(rest);
    if (!keepAsIs) s = rest;
  }

  // Nugget normalization: merge all variants ("10 McNuggets" = "10 pc. Chicken McNuggets")
  // IQR outlier filter handles deal-priced abbreviations
  const nugMatch = s.match(/^(\d+)\s*(?:pc\.?\s*)?(?:chicken\s*)?(?:spicy\s*)?mc\s*nuggets?/i);
  if (nugMatch) {
    const count = nugMatch[1];
    const isSpicy = /spicy/i.test(s);
    const isMeal = /meal|ml/i.test(s);
    const isLarge = /large/i.test(s);
    const isHappy = /happy|hm/i.test(s);
    if (isHappy) return `${count}pc-nugget-happy-meal`;
    if (isLarge && isMeal) return `${isSpicy ? 'spicy-' : ''}${count}pc-nugget-large-meal`;
    if (isMeal) return `${isSpicy ? 'spicy-' : ''}${count}pc-nugget-meal`;
    return `${isSpicy ? 'spicy-' : ''}${count}pc-nugget`;
  }

  s = s.replace(/^s\s+/, 'small ').replace(/^m\s+/, 'medium ').replace(/^l\s+/, 'large ');
  s = s.replace(/^xs\s+/, 'extra small ');
  s = s.replace(/\s+ml-lrg$/, ' large meal').replace(/\s+ml-hb$/, ' meal').replace(/\s+ml$/, ' meal');

  const coffeeMatch = s.match(/^(small|medium|large|s|m|l)\s+value\s+(dcf\s+)?coffee/i);
  if (coffeeMatch) {
    const sz = coffeeMatch[1].charAt(0) === 's' ? 'small' : coffeeMatch[1].charAt(0) === 'm' ? 'medium' : 'large';
    const decaf = coffeeMatch[2] ? 'decaf ' : '';
    return `${sz}-${decaf}coffee`;
  }

  s = s.replace(/\*+$/, '').trim();
  s = s.replace(/\bpc\.?\s*/g, 'pc ');
  return s;
}

// Remove statistical outliers using IQR (interquartile range) method
// Keeps prices within [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
function removeOutliers(sortedPrices) {
  if (sortedPrices.length < 4) return sortedPrices; // not enough data to detect outliers
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return sortedPrices.filter(p => p >= lower && p <= upper);
}

function buildMergedItems() {
  const storeNSNs = new Set(nearbyStores.map(s => s.nsn));
  const groups = {};

  for (let i = 0; i < itemNames.length; i++) {
    const raw = itemNames[i];
    if (!raw || !raw.trim()) continue;
    if (isJunkItem(raw)) continue;           // skip non-food junk

    let hasPrice = false;
    for (const nsn of storeNSNs) {
      const prices = priceMatrix[nsn];
      if (prices && prices[i] !== null && prices[i] > 0) { hasPrice = true; break; }
    }
    if (!hasPrice) continue;

    const key = dedupeKey(raw);
    if (!groups[key]) {
      groups[key] = { canonical: raw, indices: [i], cat: categorize(raw) };
    } else {
      groups[key].indices.push(i);
      if (raw.length > groups[key].canonical.length) groups[key].canonical = raw;
    }
  }

  mergedItems = [];
  for (const g of Object.values(groups)) {
    // Collect all prices for this item across stores
    const allPrices = [];
    for (const idx of g.indices) {
      for (const nsn of storeNSNs) {
        const prices = priceMatrix[nsn];
        if (prices && prices[idx] !== null && prices[idx] > 0) {
          allPrices.push(prices[idx]);
        }
      }
    }
    if (allPrices.length === 0) continue;

    // Remove outliers using IQR method, then cap and filter
    allPrices.sort((a, b) => a - b);
    let cleaned = removeOutliers(allPrices);
    cleaned = cleaned.filter(p => p <= MAX_PRICE_CENTS);  // drop $99.99 placeholders
    if (cleaned.length === 0) continue;

    // Skip items with too few stores (noise)
    const storeCount = new Set();
    for (const idx of g.indices) {
      for (const nsn of storeNSNs) {
        const prices = priceMatrix[nsn];
        if (prices && prices[idx] !== null && prices[idx] > 0 && prices[idx] <= MAX_PRICE_CENTS) {
          storeCount.add(nsn);
        }
      }
    }
    if (storeCount.size < MIN_STORE_COUNT) continue;

    const minPrice = cleaned[0];
    const maxPrice = cleaned[cleaned.length - 1];
    const sum = cleaned.reduce((a, b) => a + b, 0);

    mergedItems.push({
      canonical: g.canonical,
      indices: g.indices,
      cat: g.cat,
      minPrice,
      maxPrice,
      avgPrice: Math.round(sum / cleaned.length),
      img: getItemImage(g.canonical),
      badge: getItemBadge(g.canonical),
    });
  }

  mergedItems.sort((a, b) => a.canonical.localeCompare(b.canonical));
}

// ─── Menu Categories ───
const CATEGORIES = [
  { id: 'All',        label: 'All' },
  { id: 'Burgers',    label: 'Burgers',    kw: /hamburger|big mac|quarter pounder|mcdouble|cheeseburger|mcrib|filet-o-fish|filet o fish/i },
  { id: 'Chicken',    label: 'Chicken',     kw: /chicken|mcnugget|nugget|mccrispy|mcchicken|tender|strip|popcorn/i },
  { id: 'Breakfast',  label: 'Breakfast',   kw: /muffin|mcgriddle|hotcake|pancake|biscuit|bagel|scrambl|hash brown|breakfast|morning|egg(?!\s)/i },
  { id: 'Fries',      label: 'Fries/Sides', kw: /fries|fry\b|side|apple slice|salad|basket/i },
  { id: 'Drinks',     label: 'Drinks',      kw: /coffee|tea\b|latte|mocha|frappe|smoothie|juice|lemonade|water|sprite|coke|coca.cola|fanta|dr.pepper|hi-c|punch|drink|frozen|slushie|hawaiian/i },
  { id: 'Desserts',   label: 'Desserts',    kw: /sundae|mcflurry|shake|cone|cookie|pie|flurry|caramel|fudge|oreo|m&m/i },
  { id: 'Meals',      label: 'Meals/Combos',kw: /\bmeal\b|combo|pack\b|bundle|happy|family|\bvalue\b/i },
  { id: 'Deals',      label: 'Deals/Promos',kw: /meal deal|bundle box|shareable|2 for|2x|birthday party|collector/i },
  { id: 'Sauces',     label: 'Sauces/Extras', kw: /sauce|dipping|ketchup|mustard|mayo|syrup|jelly|butter|cream cheese|bbq|ranch|substitute|upcharge|add\b|extra\b/i },
  { id: 'Other',      label: 'Other' },
];

function categorize(name) {
  for (const cat of CATEGORIES) {
    if (cat.id === 'All' || cat.id === 'Other') continue;
    if (cat.kw && cat.kw.test(name)) return cat.id;
  }
  return 'Other';
}

// ─── Screen Navigation ───
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goSplash() { showScreen('splash'); }

function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || 'Loading...';
  document.getElementById('loading').classList.add('active');
}
function hideLoading() {
  document.getElementById('loading').classList.remove('active');
}

// ─── Haversine Distance (miles) ───
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── ZIP Code Geocoding ───
async function geocodeZip(zip) {
  const r = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!r.ok) throw new Error('Invalid ZIP code');
  const data = await r.json();
  const place = data.places[0];
  return {
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude),
    city: place['place name'],
    state: place['state']
  };
}

// ─── State directory mapping ───
function stateToDir(stateName) {
  if (allStates.includes(stateName)) return stateName;
  const lower = stateName.toLowerCase();
  const match = allStates.find(s => s.toLowerCase() === lower);
  if (match) return match;
  const abbrevMap = {
    'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
    'CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia',
    'FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois',
    'IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana',
    'ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota',
    'MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada',
    'NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York',
    'NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon',
    'PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota',
    'TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia',
    'WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'
  };
  return abbrevMap[stateName] || null;
}

// ─── Load State Data ───
async function loadStateData(stateDir) {
  if (currentState === stateDir) return;

  showLoading(`Loading ${stateDir} data...`);

  const base = `../data/${encodeURIComponent(stateDir)}`;

  const [storesResp, localResp, pricesResp] = await Promise.all([
    fetch(`${base}/stores.csv`).then(r => r.text()),
    fetch(`${base}/localization.csv`).then(r => r.text()),
    fetch(`${base}/prices_en-US.csv`).then(r => r.text()),
  ]);

  stores = [];
  const storeLines = storesResp.trim().split('\n');
  for (let i = 1; i < storeLines.length; i++) {
    const parts = parseCSVLine(storeLines[i]);
    if (parts.length >= 5) {
      stores.push({
        nsn: parts[0], address: parts[1],
        itemCount: parseInt(parts[2]) || 0,
        lat: parseFloat(parts[3]), lon: parseFloat(parts[4]),
      });
    }
  }

  const localLines = localResp.trim().split('\n');
  itemNames = localLines.slice(1);

  const priceLines = pricesResp.trim().split('\n');
  const header = priceLines[0].split(',');
  const nsns = header.slice(1);
  priceMatrix = {};

  for (const nsn of nsns) {
    priceMatrix[nsn] = new Array(itemNames.length).fill(null);
  }

  for (let row = 1; row < priceLines.length; row++) {
    const vals = priceLines[row].split(',');
    for (let col = 1; col < vals.length && col <= nsns.length; col++) {
      const price = parseInt(vals[col]);
      if (!isNaN(price) && price > 0) {
        priceMatrix[nsns[col-1]][row-1] = price;
      }
    }
  }

  currentState = stateDir;
  hideLoading();
}

// ─── CSV parser ───
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
//  SPLASH → FIND STORES (POS ordering mode)
// ═══════════════════════════════════════════════════════════════════════

async function findStores() {
  const zip = document.getElementById('zip-input').value.trim();
  const radius = parseFloat(document.getElementById('dist-select').value);
  const statusEl = document.getElementById('splash-status');

  if (!/^\d{5}$/.test(zip)) {
    statusEl.textContent = 'Please enter a valid 5-digit ZIP code';
    return;
  }

  statusEl.textContent = '';
  showLoading('Looking up ZIP code...');

  try {
    const geo = await geocodeZip(zip);
    userLat = geo.lat;
    userLon = geo.lon;

    const stateDir = stateToDir(geo.state);
    if (!stateDir) {
      hideLoading();
      statusEl.textContent = `No data available for ${geo.state}`;
      return;
    }

    await loadStateData(stateDir);

    nearbyStores = [];
    for (const store of stores) {
      const dist = haversine(userLat, userLon, store.lat, store.lon);
      if (dist <= radius) nearbyStores.push({ ...store, dist });
    }
    nearbyStores.sort((a, b) => a.dist - b.dist);

    if (nearbyStores.length === 0) {
      hideLoading();
      statusEl.textContent = `No stores found within ${radius} miles of ${zip} (${geo.city}, ${geo.state})`;
      return;
    }

    cart = [];
    activeCat = 'All';
    document.getElementById('pos-title').textContent = `${geo.city}, ${geo.state} (${zip})`;
    document.getElementById('store-count').textContent =
      `${nearbyStores.length} store${nearbyStores.length > 1 ? 's' : ''}`;

    buildMergedItems();
    buildCatBar();
    buildItemGrid();
    renderCart();
    hideLoading();
    showScreen('pos-screen');

  } catch (err) {
    hideLoading();
    statusEl.textContent = err.message;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  STATE BROWSER → PRICE CHART
// ═══════════════════════════════════════════════════════════════════════

async function showStateList() {
  showLoading('Loading state list...');

  const grid = document.getElementById('state-grid');
  grid.innerHTML = '';

  for (const state of allStates) {
    const card = document.createElement('div');
    card.className = 'state-card';
    card.innerHTML = `<div class="name">${state}</div><div class="info">View price chart</div>`;
    card.onclick = () => openChartForState(state);
    grid.appendChild(card);
  }

  hideLoading();
  showScreen('state-screen');
}

// ─── Open Chart for a State ───
async function openChartForState(stateDir) {
  try {
    await loadStateData(stateDir);
    chartState = stateDir;
    chartStores = stores.map(s => ({ ...s, dist: null }));
    chartZipGeo = null;

    document.getElementById('chart-title').textContent = stateDir;
    document.getElementById('chart-zip').value = '';
    document.getElementById('chart-store-info').textContent = `${chartStores.length} stores`;

    // Build merged items for all stores in the state
    nearbyStores = chartStores;
    buildMergedItems();

    // Populate category filter
    const catFilter = document.getElementById('chart-cat-filter');
    catFilter.innerHTML = '<option value="All">All Categories</option>';
    const catSet = new Set(mergedItems.map(m => m.cat));
    for (const cat of CATEGORIES) {
      if (cat.id !== 'All' && catSet.has(cat.id)) {
        catFilter.innerHTML += `<option value="${cat.id}">${cat.label}</option>`;
      }
    }

    renderChart();
    hideLoading();
    showScreen('chart-screen');
  } catch (err) {
    hideLoading();
    alert('Error loading ' + stateDir + ': ' + err.message);
  }
}

// ─── Chart: Filter by ZIP ───
async function chartFilterByZip() {
  const zip = document.getElementById('chart-zip').value.trim();
  if (!/^\d{5}$/.test(zip)) return;
  const radius = parseFloat(document.getElementById('chart-radius').value) || 25;

  showLoading('Geocoding ZIP...');
  try {
    const geo = await geocodeZip(zip);
    chartZipGeo = { lat: geo.lat, lon: geo.lon, city: geo.city };

    chartStores = [];
    for (const store of stores) {
      const dist = haversine(geo.lat, geo.lon, store.lat, store.lon);
      if (dist <= radius) chartStores.push({ ...store, dist });
    }
    chartStores.sort((a, b) => a.dist - b.dist);

    document.getElementById('chart-store-info').textContent =
      `${chartStores.length} stores within ${radius} mi of ${geo.city} (${zip})`;

    nearbyStores = chartStores;
    buildMergedItems();
    renderChart();
    hideLoading();
  } catch (err) {
    hideLoading();
    document.getElementById('chart-store-info').textContent = 'Invalid ZIP';
  }
}

function chartClearZip() {
  chartZipGeo = null;
  chartStores = stores.map(s => ({ ...s, dist: null }));
  document.getElementById('chart-zip').value = '';
  document.getElementById('chart-store-info').textContent = `${chartStores.length} stores`;

  nearbyStores = chartStores;
  buildMergedItems();
  renderChart();
}

// ─── Chart: Go to POS ordering mode from chart ───
function chartGoToOrder() {
  if (chartStores.length === 0) return;

  nearbyStores = chartStores;
  buildMergedItems();

  cart = [];
  activeCat = 'All';
  const title = chartZipGeo
    ? `${chartZipGeo.city} (${document.getElementById('chart-zip').value})`
    : chartState;
  document.getElementById('pos-title').textContent = title;
  document.getElementById('store-count').textContent =
    `${nearbyStores.length} store${nearbyStores.length > 1 ? 's' : ''}`;

  buildCatBar();
  buildItemGrid();
  renderCart();
  showScreen('pos-screen');
}

// ─── Chart: Column sort state ───
let chartColSort = null; // { itemKey, dir }

// ─── Color helpers ───
function redGreen(value, min, max) {
  if (min === max) return 'transparent';
  const r = (value - min) / (max - min);
  return `rgba(${Math.round(255*r)},${Math.round(255*(1-r))},0,0.45)`;
}

// ─── Render Price Chart — Stores as rows, Items as columns ───
function renderChart() {
  const search = (document.getElementById('chart-search').value || '').toLowerCase();
  const catFilter = document.getElementById('chart-cat-filter').value;
  const highlight = document.getElementById('chart-highlight').value;

  // Filter items (columns)
  let items = mergedItems.filter(item => {
    if (catFilter !== 'All' && item.cat !== catFilter) return false;
    if (search && !item.canonical.toLowerCase().includes(search)) return false;
    return true;
  });

  // Cap columns to avoid freezing the browser
  const MAX_COLS = 80;
  if (items.length > MAX_COLS) items = items.slice(0, MAX_COLS);

  // Compute per-item global stats across visible stores
  const itemStats = items.map(item => {
    let min = Infinity, max = 0, sum = 0, count = 0;
    for (const store of chartStores) {
      const p = getStorePriceForIndices(store.nsn, item.indices);
      if (p !== null) { min = Math.min(min, p); max = Math.max(max, p); sum += p; count++; }
    }
    return { min: min === Infinity ? 0 : min, max, avg: count ? Math.round(sum/count) : 0, count };
  });

  // Sort stores (rows) by column if a column sort is active
  let displayStores = [...chartStores];
  if (chartColSort) {
    const colIdx = items.findIndex(it => it.canonical === chartColSort.itemKey);
    if (colIdx >= 0) {
      const item = items[colIdx];
      displayStores.sort((a, b) => {
        const pa = getStorePriceForIndices(a.nsn, item.indices);
        const pb = getStorePriceForIndices(b.nsn, item.indices);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return chartColSort.dir === 'asc' ? pa - pb : pb - pa;
      });
    }
  }

  // ── Build header: NSN | Address | [Distance] | Item1 | Item2 | ... ──
  const thead = document.getElementById('chart-thead');
  const hasDistance = chartStores.some(s => s.dist !== null);

  let headerHtml = `<tr>
    <th class="col-nsn">#</th>
    <th class="col-addr">Address</th>
    ${hasDistance ? '<th>Dist</th>' : ''}`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isSorted = chartColSort && chartColSort.itemKey === item.canonical;
    const sortClass = isSorted ? (chartColSort.dir === 'asc' ? ' sorted-asc' : ' sorted-desc') : '';
    const badge = item.badge
      ? ` <span class="badge-${item.badge}" style="font-size:0.5rem">${item.badge === 'deal' ? 'D' : 'P'}</span>`
      : '';
    headerHtml += `<th class="item-col${sortClass}" data-col="${i}" title="${escapeHtml(item.canonical)}">${escapeHtml(item.canonical)}${badge}</th>`;
  }
  headerHtml += '</tr>';
  thead.innerHTML = headerHtml;

  // Attach click handlers for column sorting
  thead.querySelectorAll('th.item-col').forEach(th => {
    th.addEventListener('click', () => {
      const idx = parseInt(th.dataset.col);
      const key = items[idx].canonical;
      if (chartColSort && chartColSort.itemKey === key) {
        chartColSort = chartColSort.dir === 'asc' ? { itemKey: key, dir: 'desc' } : null;
      } else {
        chartColSort = { itemKey: key, dir: 'asc' };
      }
      renderChart();
    });
  });

  // ── Summary rows: MIN / AVG / MAX ──
  const tbody = document.getElementById('chart-tbody');
  let html = '';

  const summaryLabels = ['MIN', 'AVG', 'MAX'];
  for (const label of summaryLabels) {
    html += `<tr class="summary-row"><td class="col-nsn"><b>${label}</b></td><td class="col-addr"></td>${hasDistance ? '<td></td>' : ''}`;
    for (let i = 0; i < items.length; i++) {
      const s = itemStats[i];
      let val = 0;
      if (label === 'MIN') val = s.min;
      else if (label === 'AVG') val = s.avg;
      else if (label === 'MAX') val = s.max;
      const color = label === 'MIN' ? '#4caf50' : label === 'MAX' ? '#e55' : '#ffbc0d';
      html += `<td style="color:${color};font-weight:700">${val > 0 ? formatCents(val) : '–'}</td>`;
    }
    html += '</tr>';
  }
  html += `<tr class="divider-row"><td colspan="${2 + (hasDistance ? 1 : 0) + items.length}"></td></tr>`;

  // ── Store rows ──
  if (displayStores.length === 0) {
    html += `<tr><td colspan="${2 + (hasDistance ? 1 : 0) + items.length}" style="text-align:center;color:#666;padding:40px">No stores</td></tr>`;
  } else {
    for (const store of displayStores) {
      const distCell = hasDistance
        ? `<td style="color:#888;font-size:0.65rem">${store.dist !== null ? store.dist.toFixed(1) + ' mi' : ''}</td>`
        : '';

      html += `<tr>
        <td class="col-nsn" style="color:#888">${store.nsn}</td>
        <td class="col-addr" title="${escapeHtml(store.address)}">${escapeHtml(store.address)}</td>
        ${distCell}`;

      for (let i = 0; i < items.length; i++) {
        const p = getStorePriceForIndices(store.nsn, items[i].indices);
        if (p === null) {
          html += '<td class="na-cell">–</td>';
        } else {
          let bg = 'transparent';
          const { min, max } = itemStats[i];
          if (highlight === 'gradient' && min !== max) {
            bg = redGreen(p, min, max);
          } else if (highlight === 'lowest' && p === min && min !== max) {
            bg = 'rgba(0,200,0,0.35)';
          } else if (highlight === 'highest' && p === max && min !== max) {
            bg = 'rgba(200,0,0,0.35)';
          }
          html += `<td style="background:${bg}">${formatCents(p)}</td>`;
        }
      }

      html += '</tr>';
    }
  }

  tbody.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════
//  POS GRID (ordering mode)
// ═══════════════════════════════════════════════════════════════════════

function buildCatBar() {
  const bar = document.getElementById('cat-bar');
  bar.innerHTML = '';

  const catCounts = {};
  for (const cat of CATEGORIES) catCounts[cat.id] = 0;
  for (const item of mergedItems) {
    catCounts['All']++;
    catCounts[item.cat]++;
  }

  for (const cat of CATEGORIES) {
    if (cat.id !== 'All' && catCounts[cat.id] === 0) continue;
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat.id === activeCat ? ' active' : '');
    btn.textContent = `${cat.label} (${catCounts[cat.id]})`;
    btn.onclick = () => {
      activeCat = cat.id;
      bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildItemGrid();
    };
    bar.appendChild(btn);
  }
}

function buildItemGrid() {
  const grid = document.getElementById('item-grid');
  grid.innerHTML = '';

  let count = 0;
  for (const item of mergedItems) {
    if (activeCat !== 'All' && item.cat !== activeCat) continue;
    count++;

    const card = document.createElement('div');
    card.className = 'item-card';

    const priceStr = formatCents(item.minPrice);
    const rangeStr = item.minPrice !== item.maxPrice
      ? `${formatCents(item.minPrice)} – ${formatCents(item.maxPrice)}`
      : '';

    const imgHtml = item.img
      ? `<img class="item-img" src="${item.img}?wid=96&hei=96&fmt=png-alpha" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="item-img-placeholder"></div>`;

    const badgeHtml = item.badge
      ? `<span class="item-badge ${item.badge}">${item.badge === 'deal' ? 'DEAL' : 'PROMO'}</span>`
      : '';

    card.innerHTML = `
      ${badgeHtml}
      ${imgHtml}
      <div class="item-name">${escapeHtml(item.canonical)}</div>
      <div class="item-price">${priceStr}</div>
      ${rangeStr ? `<div class="item-range">${rangeStr}</div>` : ''}
    `;

    card.onclick = () => addToCart(item);
    grid.appendChild(card);
  }

  if (count === 0) {
    grid.innerHTML = '<div style="color:#555;grid-column:1/-1;text-align:center;padding:40px">No items in this category</div>';
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  CART & COMPARISON
// ═══════════════════════════════════════════════════════════════════════

function addToCart(mergedItem) {
  // Warn if adding a promo/deal and cart already has one
  if (mergedItem.badge) {
    const existingPromo = cart.find(c => c.badge);
    if (existingPromo) {
      const el = document.getElementById('cart-items');
      const warning = el.querySelector('.cart-promo-warning');
      if (!warning) {
        const div = document.createElement('div');
        div.className = 'cart-promo-warning';
        div.style.cssText = 'color:#ff6b00;font-size:0.7rem;padding:6px 8px;background:#2a1a00;border-radius:4px;margin:4px';
        div.textContent = 'Note: Deals/promos usually cannot be combined with other promos at checkout.';
        el.prepend(div);
      }
    }
  }

  const existing = cart.find(c => c.key === mergedItem.canonical);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      key: mergedItem.canonical,
      name: mergedItem.canonical,
      indices: mergedItem.indices,
      qty: 1,
      badge: mergedItem.badge,
    });
  }
  renderCart();
}

function removeFromCart(key) {
  const idx = cart.findIndex(c => c.key === key);
  if (idx === -1) return;
  cart[idx].qty--;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  // Remove promo warning if no promos left
  if (!cart.some(c => c.badge)) {
    const warning = document.querySelector('.cart-promo-warning');
    if (warning) warning.remove();
  }
  renderCart();
}

function clearCart() {
  cart = [];
  const warning = document.querySelector('.cart-promo-warning');
  if (warning) warning.remove();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  // Preserve promo warning if present
  const existingWarning = container.querySelector('.cart-promo-warning');

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">Tap items to add</div>';
    totalEl.textContent = '$0.00';
    return;
  }

  let html = '';
  let totalCents = 0;

  for (const item of cart) {
    const avgPrice = getAveragePriceForIndices(item.indices);
    const lineTotal = avgPrice * item.qty;
    totalCents += lineTotal;

    const dealTag = item.badge
      ? `<span style="font-size:0.55rem;color:${item.badge === 'deal' ? '#4caf50' : '#ff6b00'};margin-left:4px">${item.badge === 'deal' ? 'DEAL' : 'PROMO'}</span>`
      : '';

    html += `
      <div class="cart-row">
        <div class="cart-qty">${item.qty}</div>
        <div class="cart-name">${escapeHtml(item.name)}${dealTag}</div>
        <div class="cart-price">${formatCents(lineTotal)}</div>
        <button class="cart-remove" onclick="removeFromCart('${item.key.replace(/'/g, "\\'")}')">&times;</button>
      </div>
    `;
  }

  container.innerHTML = html;
  if (existingWarning) container.prepend(existingWarning);
  totalEl.textContent = formatCents(totalCents);
}

function getAveragePriceForIndices(indices) {
  let sum = 0, count = 0;
  for (const store of nearbyStores) {
    const prices = priceMatrix[store.nsn];
    if (!prices) continue;
    let best = null;
    for (const idx of indices) {
      if (prices[idx] !== null && prices[idx] > 0 && prices[idx] <= MAX_PRICE_CENTS) {
        if (best === null || prices[idx] < best) best = prices[idx];
      }
    }
    if (best !== null) { sum += best; count++; }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

function getStorePriceForIndices(nsn, indices) {
  const prices = priceMatrix[nsn];
  if (!prices) return null;
  let best = null;
  for (const idx of indices) {
    if (prices[idx] !== null && prices[idx] > 0 && prices[idx] <= MAX_PRICE_CENTS) {
      if (best === null || prices[idx] < best) best = prices[idx];
    }
  }
  return best;
}

function showComparison() {
  if (cart.length === 0) return;

  const body = document.getElementById('compare-body');
  const results = [];

  for (const store of nearbyStores) {
    let total = 0, missing = [], breakdown = [];

    for (const item of cart) {
      const p = getStorePriceForIndices(store.nsn, item.indices);
      if (p !== null) {
        const line = p * item.qty;
        total += line;
        breakdown.push({ name: item.name, qty: item.qty, price: line });
      } else {
        missing.push(item.name);
      }
    }

    if (breakdown.length > 0) {
      results.push({ store, total, missing, breakdown, hasAll: missing.length === 0 });
    }
  }

  results.sort((a, b) => {
    if (a.hasAll !== b.hasAll) return a.hasAll ? -1 : 1;
    return a.total - b.total;
  });

  const cheapest = results.find(r => r.hasAll);
  const cheapestTotal = cheapest ? cheapest.total : null;

  let html = '';
  if (results.length === 0) {
    html = '<div style="color:#888;text-align:center;padding:20px">No stores have these items</div>';
  } else {
    for (const r of results.slice(0, 15)) {
      const isCheapest = cheapestTotal !== null && r.total === cheapestTotal && r.hasAll;
      const distStr = r.store.dist !== null ? ` · ${r.store.dist.toFixed(1)} mi` : '';
      const savings = cheapestTotal !== null && r.hasAll && r.total > cheapestTotal
        ? `+${formatCents(r.total - cheapestTotal)} more`
        : '';

      html += `
        <div class="compare-store ${isCheapest ? 'cheapest' : ''}">
          <div class="store-addr">${escapeHtml(r.store.address)}${distStr}</div>
          <div class="store-total">${formatCents(r.total)}${isCheapest ? ' — Best Price!' : ''}</div>
          ${savings ? `<div class="store-savings">${savings}</div>` : ''}
          ${r.missing.length ? `<div class="missing-items">Missing: ${r.missing.map(escapeHtml).join(', ')}</div>` : ''}
          <div class="item-breakdown">
            ${r.breakdown.map(b => `<div><span>${b.qty}x ${escapeHtml(b.name)}</span><span>${formatCents(b.price)}</span></div>`).join('')}
          </div>
        </div>
      `;
    }
  }

  body.innerHTML = html;
  document.getElementById('compare-modal').classList.add('active');
}

function closeCompare(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('compare-modal').classList.remove('active');
}

// ─── Utilities ───
function formatCents(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ─── Event Listeners ───
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('zip-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') findStores();
  });

  document.getElementById('chart-zip').addEventListener('keydown', e => {
    if (e.key === 'Enter') chartFilterByZip();
  });

  // Debounced chart search
  let searchTimer;
  document.getElementById('chart-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderChart, 200);
  });

  // Mobile cart toggle — tap header to expand/collapse
  const cartHeader = document.querySelector('.pos-cart .cart-header');
  if (cartHeader) {
    cartHeader.addEventListener('click', () => {
      document.querySelector('.pos-cart').classList.toggle('expanded');
    });
  }
});
