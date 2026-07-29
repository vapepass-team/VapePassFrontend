/**
 * Lightweight NLU for the shopping chat — normalize text, extract intent,
 * and fuzzy-match against inventory option labels.
 * Presentation / matching helpers only; does not change recommendation APIs.
 */

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'i',
  'im',
  'i\'m',
  'me',
  'my',
  'want',
  'wanted',
  'looking',
  'for',
  'like',
  'likes',
  'love',
  'prefer',
  'preferred',
  'please',
  'something',
  'some',
  'any',
  'with',
  'without',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'is',
  'are',
  'be',
  'get',
  'got',
  'need',
  'needs',
  'would',
  'could',
  'can',
  'you',
  'your',
  'that',
  'this',
  'it',
  'its',
  'have',
  'has',
  'usually',
  'really',
  'very',
  'more',
  'less',
  'also',
  'just',
  'kind',
  'type',
  'sort',
]);

/** Canonical synonym groups → preferred token */
const SYNONYM_GROUPS = [
  {
    canonical: 'eliquid',
    aliases: [
      'e-liquid',
      'e-liquids',
      'e liquid',
      'e liquids',
      'eliquid',
      'eliquids',
      'ejuice',
      'e-juice',
      'e juice',
      'ejuices',
      'vape juice',
      'vape juices',
      'salt nic',
      'saltnic',
      'nic salt',
      'nicotine salt',
    ],
  },
  {
    canonical: 'disposable',
    aliases: [
      'disposable',
      'disposables',
      'disposable vape',
      'disposable vapes',
      'dispo',
      'dispos',
      'puff bar',
      'puffbar',
      'throwaway',
    ],
  },
  {
    canonical: 'prefilled',
    aliases: [
      'prefilled',
      'pre-filled',
      'prefilled pod',
      'prefilled pods',
      'pre-filled pod',
      'pre-filled pods',
      'closed pod',
      'closed pods',
    ],
  },
  {
    canonical: 'cartridge',
    aliases: ['cartridge', 'cartridges', 'cart', 'carts', '510 cartridge', '510 cart'],
  },
  {
    canonical: 'device',
    aliases: ['device', 'devices', 'kit', 'kits', 'mod', 'mods', 'vape kit', 'starter kit', 'devices & kits'],
  },
  {
    canonical: 'pod',
    aliases: ['pod system', 'pod systems', 'pod kit', 'pod kits', 'pod', 'pods'],
  },
  {
    canonical: 'tropical',
    aliases: [
      'tropical',
      'tropicals',
      'tropical fruit',
      'tropical fruits',
      'tropical flavor',
      'tropical flavour',
      'tropical vape',
      'fruity tropical',
    ],
  },
  {
    canonical: 'fruity',
    aliases: ['fruit', 'fruits', 'fruity', 'fruit flavor', 'fruit flavour', 'fruit taste'],
  },
  {
    canonical: 'mango',
    aliases: ['mango', 'mangoes', 'mango flavor', 'mango flavour', 'mango-ish', 'mangoish', 'mango taste'],
  },
  {
    canonical: 'berry',
    aliases: ['berry', 'berries', 'mixed berry', 'berry flavor', 'berry flavour'],
  },
  {
    canonical: 'citrus',
    aliases: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'lemon-lime', 'lemonade'],
  },
  {
    canonical: 'melon',
    aliases: ['melon', 'melons', 'watermelon', 'honeydew', 'cantaloupe', 'melonish'],
  },
  {
    canonical: 'strawberry',
    aliases: ['strawberry', 'strawberries', 'strawberry flavor', 'strawberry flavour'],
  },
  {
    canonical: 'dessert',
    aliases: ['dessert', 'desserts', 'pastry', 'bakery', 'custard', 'cream'],
  },
  {
    canonical: 'candy',
    aliases: ['candy', 'candies', 'sweet candy', 'gummy', 'sour candy'],
  },
  {
    canonical: 'beverage',
    aliases: ['beverage', 'drink', 'soda', 'cola', 'energy drink', 'coffee', 'tea'],
  },
  {
    canonical: 'ice',
    aliases: [
      'ice',
      'iced',
      'icy',
      'cooling',
      'cool',
      'cold',
      'cold finish',
      'frost',
      'freeze',
      'chill',
      'chilled',
    ],
  },
  {
    canonical: 'heavy_ice',
    aliases: ['heavy ice', 'extra ice', 'max ice', 'ultra ice', 'strong ice', 'lots of ice'],
  },
  {
    canonical: 'menthol',
    aliases: ['menthol', 'menthols', 'menthol flavor', 'menthol flavour', 'menthol taste'],
  },
  {
    canonical: 'mint',
    aliases: ['mint', 'minty', 'spearmint', 'peppermint'],
  },
  {
    canonical: 'sweet',
    aliases: ['sweet', 'sweeter', 'sweetness', 'sugary'],
  },
  {
    canonical: 'smooth',
    aliases: ['smooth', 'mild', 'soft', 'gentle'],
  },
];

const EXCLUDE_PATTERNS = [
  { re: /\b(?:no|without|dont|don't|do not|hate|dislike|not)\s+(?:any\s+)?menthol\b/i, exclude: 'menthol' },
  { re: /\b(?:no|without|dont|don't|do not)\s+(?:any\s+)?(?:ice|icing|cooling|cool)\b/i, exclude: 'ice' },
  { re: /\b(?:no|without|dont|don't|do not)\s+(?:any\s+)?(?:sweet|sweets|sugary)\b/i, exclude: 'sweet' },
  { re: /\b(?:no|without|dont|don't|do not)\s+(?:any\s+)?nicotine\b/i, exclude: 'nicotine' },
];

function collapseSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

/** Basic Latin fold + lowercase */
export function foldText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Normalize free text for matching: punctuation, hyphens, spelling variants.
 */
export function normalizeText(value) {
  let t = foldText(value);
  t = t
    .replace(/[’']/g, "'")
    .replace(/flavour/g, 'flavor')
    .replace(/colours?/g, 'color')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+\s'-]/g, ' ')
    .replace(/-/g, ' ');
  t = collapseSpaces(t);

  // Compound product-type phrases → canonical tokens
  t = t
    .replace(/\be\s*liquids?\b/g, ' eliquid ')
    .replace(/\beliquids?\b/g, ' eliquid ')
    .replace(/\be\s*juices?\b/g, ' eliquid ')
    .replace(/\bvape\s*juices?\b/g, ' eliquid ')
    .replace(/\bdisposables?\b/g, ' disposable ')
    .replace(/\bpod\s*systems?\b/g, ' pod ')
    .replace(/\bpod\s*kits?\b/g, ' pod ')
    .replace(/\bheavy\s+ice\b/g, ' heavy_ice ')
    .replace(/\bextra\s+ice\b/g, ' heavy_ice ')
    .replace(/\bmax\s+ice\b/g, ' heavy_ice ')
    .replace(/\bmango[\s-]?ish\b/g, ' mango ')
    .replace(/\bmelon[\s-]?ish\b/g, ' melon ')
    .replace(/\bberry[\s-]?ish\b/g, ' berry ')
    .replace(/\b([a-z]{3,})ish\b/g, ' $1 ')
    .replace(/\btropical\s+fruits?\b/g, ' tropical ')
    .replace(/\btropical\s+flavou?rs?\b/g, ' tropical ')
    .replace(/\bfruit(?:y|s)?\s+flavou?rs?\b/g, ' fruity ')
    .replace(/\bmenthol\s+flavou?rs?\b/g, ' menthol ')
    .replace(/\bcitrus\s+flavou?rs?\b/g, ' citrus ')
    .replace(/\blemon\s+flavou?rs?\b/g, ' lemon ')
    .replace(/\bminty\b/g, ' mint ')
    .replace(/\bicy\b/g, ' ice ')
    .replace(/\biced\b/g, ' ice ')
    .replace(/\bcooling\b/g, ' ice ')
    .replace(/\bcold\s+finish\b/g, ' ice ');

  return collapseSpaces(t);
}

/** Very light stemmer for English shopping terms */
export function stemToken(token) {
  let t = String(token || '').toLowerCase();
  if (t.length <= 3) return t;
  if (t.endsWith('ies') && t.length > 4) return `${t.slice(0, -3)}y`;
  if (t.endsWith('oes') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('ses') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) {
    t = t.slice(0, -1);
  }
  if (t.endsWith('ing') && t.length > 5) t = t.slice(0, -3);
  if (t.endsWith('ed') && t.length > 4) t = t.slice(0, -2);
  return t;
}

export function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map((tok) => tok.replace(/^'+|'+$/g, ''))
    .filter((tok) => tok && !STOP_WORDS.has(tok))
    .map(stemToken)
    .filter(Boolean);
}

function buildAliasLookup() {
  const map = new Map();
  for (const group of SYNONYM_GROUPS) {
    for (const alias of group.aliases) {
      map.set(normalizeText(alias), group.canonical);
      map.set(stemToken(normalizeText(alias).replace(/\s+/g, '')), group.canonical);
    }
    map.set(group.canonical, group.canonical);
  }
  return map;
}

const ALIAS_LOOKUP = buildAliasLookup();

/** Map a phrase/token to canonical synonym when known */
export function canonicalizePhrase(phrase) {
  const n = normalizeText(phrase);
  if (!n) return '';
  if (ALIAS_LOOKUP.has(n)) return ALIAS_LOOKUP.get(n);
  const compact = n.replace(/\s+/g, '');
  if (ALIAS_LOOKUP.has(compact)) return ALIAS_LOOKUP.get(compact);
  const stemmed = n
    .split(/\s+/)
    .map(stemToken)
    .join(' ');
  if (ALIAS_LOOKUP.has(stemmed)) return ALIAS_LOOKUP.get(stemmed);
  return n;
}

/**
 * Match key used for fuzzy label comparison (hyphens/plurals/synonyms collapsed).
 */
export function matchKey(value) {
  const canonical = canonicalizePhrase(value);
  return canonicalizePhrase(canonical).replace(/\s+/g, '');
}

export function tokensOverlapScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const b = new Set(bTokens.map((t) => matchKey(t)));
  let hits = 0;
  for (const t of aTokens) {
    if (b.has(matchKey(t))) hits += 1;
  }
  return hits / Math.max(aTokens.length, bTokens.length);
}

/** Levenshtein distance for minor typos */
export function editDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = Array.from({ length: s.length + 1 }, (_, i) => i);
  for (let j = 1; j <= t.length; j += 1) {
    let prev = j - 1;
    rows[0] = j;
    for (let i = 1; i <= s.length; i += 1) {
      const cur = rows[i];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      rows[i] = Math.min(rows[i] + 1, rows[i - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return rows[s.length];
}

export function fuzzyEquals(a, b, maxDistance = 1) {
  const ka = matchKey(a);
  const kb = matchKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const ratio = Math.min(ka.length, kb.length) / Math.max(ka.length, kb.length);
  if (ratio >= 0.9 && editDistance(ka, kb) <= 1) return true;
  const maxLen = Math.max(ka.length, kb.length);
  if (maxLen <= 3) return false;
  if (maxLen >= 5 && maxLen <= 10 && editDistance(ka, kb) === 1 && ratio >= 0.85) {
    return true;
  }
  return false;
}

/** Rarely block — *-ish forms are normalized to base stems for matching. */
export function isSpeculativeInput(value) {
  const compact = foldText(value).replace(/[^a-z0-9]/g, '');
  if (!compact || compact.length <= 1) return true;
  // Only treat as speculative when there is no alphabetic content
  return !/[a-z]/i.test(compact);
}

/**
 * Extract structured shopping intent from a free-form message.
 */
export function extractIntent(message) {
  const raw = String(message || '').trim();
  const normalized = normalizeText(raw);
  const tokens = tokenize(raw);
  const excludes = [];
  for (const rule of EXCLUDE_PATTERNS) {
    if (rule.re.test(raw)) excludes.push(rule.exclude);
  }

  const found = new Set();
  // Multi-word alias scan on normalized text
  for (const group of SYNONYM_GROUPS) {
    for (const alias of group.aliases) {
      const nAlias = normalizeText(alias);
      if (nAlias && (normalized.includes(nAlias) || matchKey(normalized).includes(matchKey(nAlias)))) {
        found.add(group.canonical);
      }
    }
  }
  for (const tok of tokens) {
    const c = canonicalizePhrase(tok);
    if (SYNONYM_GROUPS.some((g) => g.canonical === c)) found.add(c);
  }

  const intent = {
    raw,
    normalized,
    tokens,
    productType: null,
    flavor: null,
    category: null,
    cooling: null,
    sweetness: null,
    excludes,
    keywords: [],
    lookingFor: [],
  };

  if (found.has('eliquid')) intent.productType = 'E-Liquid';
  else if (found.has('disposable')) intent.productType = 'Disposable';
  else if (found.has('prefilled')) intent.productType = 'Prefilled Pod';
  else if (found.has('cartridge')) intent.productType = 'Cartridge';
  else if (found.has('device')) intent.productType = 'Device';
  else if (found.has('pod')) intent.productType = 'Pod System';

  if (found.has('mango')) intent.flavor = 'Mango';
  else if (found.has('strawberry')) intent.flavor = 'Strawberry';
  else if (found.has('melon')) intent.flavor = 'Melon';
  else if (found.has('berry')) intent.flavor = 'Berry';
  else if (found.has('citrus') || found.has('lemon')) intent.flavor = 'Citrus';
  else if (found.has('tropical')) intent.flavor = 'Tropical';
  else if (found.has('mint')) intent.flavor = 'Mint';
  else if (found.has('menthol')) intent.flavor = 'Menthol';

  // lemon token may only appear via alias group citrus
  if (!intent.flavor && /\blemon\b/i.test(raw)) intent.flavor = 'Citrus';
  if (!intent.flavor && /\bmelon/i.test(raw)) intent.flavor = 'Melon';

  if (found.has('citrus') || found.has('lemon')) {
    intent.category = 'Citrus';
  } else if (found.has('tropical') || found.has('mango')) {
    intent.category = 'Tropical';
  } else if (found.has('berry')) {
    intent.category = 'Berry';
  } else if (found.has('fruity')) {
    intent.category = 'Fruity';
  } else if (found.has('dessert')) intent.category = 'Dessert';
  else if (found.has('candy')) intent.category = 'Candy';
  else if (found.has('beverage')) intent.category = 'Beverage';
  else if (found.has('menthol') || found.has('mint')) intent.category = 'Menthol / Mint';

  if (found.has('heavy_ice')) intent.cooling = 'Heavy Ice';
  else if (found.has('ice') && !excludes.includes('ice')) intent.cooling = 'Ice';
  else if (excludes.includes('ice')) intent.cooling = 'No Ice';

  if (found.has('sweet') && !excludes.includes('sweet')) intent.sweetness = 'Sweet';
  if (found.has('smooth')) intent.lookingFor.push('Smooth');

  const lookingFor = [];
  if (intent.productType) lookingFor.push(intent.productType);
  if (intent.flavor) lookingFor.push(`${intent.flavor} flavor`);
  if (intent.category && intent.category !== intent.flavor) lookingFor.push(intent.category);
  if (intent.cooling) lookingFor.push(intent.cooling);
  if (intent.sweetness) lookingFor.push(intent.sweetness);
  for (const ex of excludes) lookingFor.push(`No ${ex}`);
  intent.lookingFor = [...new Set(lookingFor)];

  intent.keywords = [
    ...new Set(
      [
        intent.productType,
        intent.flavor,
        intent.category,
        intent.cooling,
        intent.sweetness,
        ...tokens.map((t) => canonicalizePhrase(t)),
      ].filter(Boolean)
    ),
  ];

  return intent;
}

/**
 * Score how well an option label matches the user message / intent.
 */
export function scoreOptionMatch(message, option, intent = null) {
  const analysis = intent || extractIntent(message);
  const label = String(option?.label || option?.value || '');
  if (!label) return 0;

  const msgKey = matchKey(analysis.normalized || message);
  const labelKey = matchKey(label);
  if (!labelKey) return 0;

  let score = 0;
  if (msgKey && labelKey && msgKey === labelKey) score += 100;
  else if (msgKey && fuzzyEquals(msgKey, labelKey, 1)) score += 85;
  const labelTokens = tokenize(label);
  const userTokens = analysis.tokens?.length ? analysis.tokens : tokenize(message);

  for (const ut of userTokens) {
    if (labelTokens.includes(ut)) score += 55;
    else if (labelTokens.some((lt) => fuzzyEquals(ut, lt))) score += 48;
    else if (normalizeText(label).includes(ut) && ut.length >= 4) score += 42;
  }

  const bridges = [
    [['lemon', 'lime', 'orange'], ['citrus']],
    [['strawberry', 'blueberry', 'raspberry'], ['berry', 'berries']],
    [['mango', 'pineapple'], ['tropical']],
    [['melon', 'watermelon'], ['melon', 'grape']],
    [['fruity', 'fruit'], ['berry', 'tropical', 'citrus', 'melon', 'fruity', 'grape']],
  ];
  for (const [from, to] of bridges) {
    if (!userTokens.some((t) => from.includes(t))) continue;
    if (labelTokens.some((t) => to.includes(t) || from.includes(t))) score += 45;
  }

  for (const kw of analysis.keywords || []) {
    if (fuzzyEquals(kw, label) || matchKey(label).includes(matchKey(String(kw)))) score += 25;
  }

  if (msgKey && labelKey && (msgKey.includes(labelKey) || labelKey.includes(msgKey))) {
    const ratio = Math.min(msgKey.length, labelKey.length) / Math.max(msgKey.length, labelKey.length);
    if (ratio >= 0.75) score += 40;
  }

  score += Math.min(labelKey.length, 20) * 0.1;
  return score;
}

/**
 * Assess match confidence before accepting an option or recommending.
 */
export function assessOptionMatch(message, options = []) {
  const list = Array.isArray(options) ? options : [];
  if (!message || !list.length) {
    return { status: 'unknown', suggestions: list.slice(0, 8) };
  }

  const intent = extractIntent(message);
  const scored = list
    .map((option) => ({ option, score: scoreOptionMatch(message, option, intent) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  const suggestions = scored.slice(0, 8).map((s) => s.option);
  const CONFIDENT_MIN = 55;
  const LIKELY_MIN = 38;

  if (!best) return { status: 'unknown', suggestions, intent };

  if (best.score >= CONFIDENT_MIN) {
    if (second && second.score >= LIKELY_MIN && best.score - second.score < 10) {
      const tokens = intent.tokens || [];
      const specific = scored.find((s) => {
        const lab = tokenize(s.option.label);
        if (tokens.includes('lemon') || tokens.includes('lime')) {
          return lab.includes('citrus') || lab.includes('lemon');
        }
        if (tokens.includes('strawberry') || tokens.includes('blueberry')) {
          return lab.includes('berry') || lab.includes('strawberry');
        }
        if (tokens.includes('melon')) {
          return lab.includes('melon') || lab.includes('grape');
        }
        return false;
      });
      if (specific && specific.score >= LIKELY_MIN) {
        return {
          status: 'confident',
          option: specific.option,
          score: specific.score,
          suggestions: [specific.option],
          intent,
        };
      }
      return {
        status: 'ambiguous',
        suggestions: scored.filter((s) => s.score >= LIKELY_MIN).slice(0, 8).map((s) => s.option),
        score: best.score,
        likely: best.option,
        intent,
        reason: 'related',
      };
    }
    return {
      status: 'confident',
      option: best.option,
      score: best.score,
      suggestions: [best.option],
      intent,
    };
  }

  if (
    best.score >= LIKELY_MIN &&
    (!second || best.score - second.score >= 10 || second.score < LIKELY_MIN)
  ) {
    return {
      status: 'confident',
      option: best.option,
      score: best.score,
      suggestions: [best.option],
      intent,
    };
  }

  return {
    status: 'unknown',
    suggestions,
    score: best.score,
    likely: best.score >= 20 ? best.option : null,
    intent,
  };
}

/**
 * Pick best matching option using NLU only when confidence is high.
 */
export function matchOptionWithNlu(message, options = []) {
  const assessment = assessOptionMatch(message, options);
  if (assessment.status !== 'confident' || !assessment.option) return null;
  return {
    option: assessment.option,
    score: assessment.score,
    intent: assessment.intent,
  };
}

/**
 * Build an enriched outbound search hint — only when intent is confidently extracted.
 */
export function buildEnrichedSearchMessage(message, intent = null) {
  const analysis = intent || extractIntent(message);
  const original = String(message || '').trim();
  if (!original) return original;

  // Require at least one clear structured signal before enriching
  if (
    !analysis.productType &&
    !analysis.flavor &&
    !analysis.category &&
    !analysis.cooling &&
    !analysis.sweetness
  ) {
    return original;
  }

  const extras = [];
  if (analysis.productType) extras.push(analysis.productType);
  if (analysis.flavor) extras.push(analysis.flavor);
  // Skip display categories like "Menthol / Mint" — they confuse option matching UX
  if (analysis.cooling) extras.push(analysis.cooling);
  if (analysis.sweetness) extras.push(analysis.sweetness);
  for (const ex of analysis.excludes || []) extras.push(`no ${ex}`);

  if (analysis.productType === 'E-Liquid') {
    extras.push('E-Liquids', 'E Liquid', 'eliquid');
  }
  if (analysis.productType === 'Disposable') {
    extras.push('Disposable Vapes', 'Disposables');
  }
  if (analysis.productType === 'Prefilled Pod') {
    extras.push('Prefilled Pods', 'Pre-filled Pods');
  }
  if (analysis.productType === 'Cartridge') {
    extras.push('Cartridges');
  }
  if (analysis.productType === 'Pod System') {
    extras.push('Pod Systems');
  }

  const unique = [...new Set(extras.map((e) => String(e).trim()).filter(Boolean))];
  if (!unique.length) return original;

  const missing = unique.filter((e) => !normalizeText(original).includes(normalizeText(e)));
  if (!missing.length) return original;
  return `${original} (${missing.join(', ')})`;
}

/**
 * Build "Why this matches" bullets from intent + product fields (presentation only).
 */
export function buildMatchReasons(product, intent, intro) {
  const reasons = [];
  const hay = normalizeText(
    [product?.name, product?.flavor, product?.variantName, product?.description, intro]
      .filter(Boolean)
      .join(' ')
  );

  if (intent?.flavor && hay.includes(normalizeText(intent.flavor))) {
    reasons.push(`${intent.flavor} flavor profile`);
  }
  if (intent?.category && hay.includes(normalizeText(intent.category))) {
    reasons.push(`Matches your ${intent.category.toLowerCase()} preference`);
  } else if (intent?.category) {
    reasons.push(`Aligned with a ${intent.category.toLowerCase()} taste direction`);
  }
  if (intent?.cooling === 'Heavy Ice' || intent?.cooling === 'Ice') {
    if (/\b(ice|iced|cool|menthol|frost)\b/.test(hay)) {
      reasons.push('Refreshing cooling effect');
    } else {
      reasons.push('Selected with your cooling preference in mind');
    }
  }
  if (intent?.cooling === 'No Ice' && !/\b(ice|iced|frost)\b/.test(hay)) {
    reasons.push('Smooth finish without heavy cooling');
  }
  if (intent?.sweetness && /\b(sweet|candy|dessert|sugar)\b/.test(hay)) {
    reasons.push('Sweet taste profile');
  }
  if (intent?.productType) {
    reasons.push(`${intent.productType} category match`);
  }
  if (product?.variantName) {
    reasons.push(`Variant: ${product.variantName}`);
  }

  const unique = [...new Set(reasons)].slice(0, 5);
  if (!unique.length && intro) {
    unique.push('Best available match for what you described');
  }
  return unique;
}

export function formatLookingForBullets(intent, fallbackMessages = []) {
  if (intent?.lookingFor?.length) return intent.lookingFor;
  const merged = [];
  for (const msg of fallbackMessages) {
    const part = extractIntent(msg);
    merged.push(...(part.lookingFor || []));
  }
  return [...new Set(merged)].slice(0, 8);
}

/** Build Looking For bullets from backend funnel preferences (includes brand). */
export function formatLookingForFromPreferences(prefs = {}) {
  if (!prefs || typeof prefs !== 'object') return [];
  const bits = [];
  const typeLabels = {
    e_liquid: 'E-Liquid',
    disposable: 'Disposable',
    device: 'Device',
    pod: 'Pod System',
    prefilled: 'Prefilled Pod',
    cartridge: 'Cartridge',
    accessory: 'Accessory',
    pouch: 'Nicotine Pouch',
  };
  if (prefs.productType) bits.push(typeLabels[prefs.productType] || prefs.productType);
  if (prefs.flavorDirection) {
    bits.push(
      prefs.flavorDirection.charAt(0).toUpperCase() + prefs.flavorDirection.slice(1)
    );
  }
  if (Array.isArray(prefs.specificFlavors)) {
    for (const f of prefs.specificFlavors) {
      if (f) bits.push(String(f).charAt(0).toUpperCase() + String(f).slice(1));
    }
  }
  if (prefs.cooling === 'ice') bits.push('Ice');
  if (prefs.cooling === 'heavy_ice') bits.push('Heavy Ice');
  if (prefs.cooling === 'no_ice') bits.push('No Ice');
  if (prefs.sweetness === 'sweet') bits.push('Sweet');
  if (prefs.sweetness === 'less_sweet') bits.push('Less Sweet');
  if (prefs.brand && prefs.brand !== 'any') bits.push(String(prefs.brand));
  if (prefs.brand === 'any') bits.push('Any brand');
  return [...new Set(bits)].slice(0, 10);
}

/** Map funnel preferences into the shape buildMatchReasons expects. */
export function intentFromPreferences(prefs = {}) {
  if (!prefs || typeof prefs !== 'object') return null;
  const typeLabels = {
    e_liquid: 'E-Liquid',
    disposable: 'Disposable',
    device: 'Device',
    pod: 'Pod System',
    prefilled: 'Prefilled Pod',
    cartridge: 'Cartridge',
    accessory: 'Accessory',
    pouch: 'Nicotine Pouch',
  };
  const coolingMap = {
    ice: 'Ice',
    heavy_ice: 'Heavy Ice',
    no_ice: 'No Ice',
  };
  const flavor = prefs.flavorDirection
    ? prefs.flavorDirection.charAt(0).toUpperCase() + prefs.flavorDirection.slice(1)
    : prefs.specificFlavors?.[0]
      ? String(prefs.specificFlavors[0]).charAt(0).toUpperCase() +
        String(prefs.specificFlavors[0]).slice(1)
      : null;
  return {
    productType: prefs.productType ? typeLabels[prefs.productType] || prefs.productType : null,
    flavor,
    category: flavor,
    cooling: prefs.cooling ? coolingMap[prefs.cooling] || null : null,
    sweetness:
      prefs.sweetness === 'sweet' ? 'Sweet' : prefs.sweetness === 'less_sweet' ? 'Less Sweet' : null,
    lookingFor: formatLookingForFromPreferences(prefs),
  };
}
