export const FLOW_STEPS = {
  AGE_VERIFY: 'age_verify',
  OPTIONS: 'options',
  FETCHING: 'fetching',
  RECOMMENDATION: 'recommendation',
  FREE_CHAT: 'free_chat',
  LOCKED: 'locked',
};

/**
 * Age-gate welcome (first message). Compliance copy only — backend still verifies age.
 */
export function getWelcomeMessage(legalAge = 19) {
  return {
    greeting: 'Welcome!',
    intro: `Are you of the legal age required to purchase vaping products in your region?`,
    question: `You must be ${legalAge}+ to continue.`,
    note: 'This assistant is for adults only.',
  };
}

/**
 * Short branding line after age — the backend open prompt asks what they want.
 */
export function getShoppingWelcomeMessage(storeName = null) {
  const storeLine = storeName
    ? `I'm your VapePass AI Shopping Assistant for ${storeName}.`
    : "I'm your VapePass AI Shopping Assistant.";

  return ['Welcome!', '', storeLine].join('\n');
}

/** @deprecated Use getWelcomeMessage(legalAge) */
export const WELCOME_MESSAGE = getWelcomeMessage(19);

export const NICOTINE_DISCLAIMER =
  'Please note that vaping products contain nicotine, which is addictive.';

export const ANOTHER_REC_PROMPT =
  'Want something different? Tell me what to change — sweeter, less ice, another product type, or a different flavor — and I\'ll refine the recommendation. Or say you want another recommendation to start fresh. If you\'re all set, just say thanks!';

/** True when the user declines a brand preference (any brand in the locked category). */
export function isNoBrandPreference(message) {
  const text = String(message || '')
    .toLowerCase()
    .replace(/[!?.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return false;
  if (
    /\b(no\s*preference|no\s*pref|any\s*brand|any\s*other\s*brand|other\s*brands?|doesn'?t\s*matter|doesnt\s*matter|don'?t\s*care|dont\s*care|whatever|surprise\s*me|you\s+(pick|choose)|no\s*brand|either\s*(is\s*)?fine|either\s*way|all\s*brands?|any\s*is\s*fine)\b/i.test(
      text
    )
  ) {
    return true;
  }
  return /^(no|none|nah|idk|n\/a|any|nope)$/i.test(text);
}

export function getAgeYesLabel(legalAge = 19) {
  return `Yes, I'm ${legalAge}+`;
}

/** Polite closing / "I'm done" — not a product request */
export function normalizeConversationEndText(message) {
  let text = String(message || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[“”"']/g, '')
    .replace(/[!?.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  text = text
    .replace(/\bthankyou\b/g, 'thank you')
    .replace(/\bthank\s*u\b/g, 'thank you')
    .replace(/\bthank\s*ya\b/g, 'thank you')
    .replace(/\bthx\b/g, 'thanks')
    .replace(/\bty\b/g, 'thanks')
    .replace(/\btysm\b/g, 'thanks')
    .replace(/\bthank\s+you\b/g, 'thank you');

  return text;
}

export function detectsConversationEnd(message) {
  const raw = String(message || '').trim();
  if (!raw) return false;

  const text = normalizeConversationEndText(raw);
  if (!text) return false;

  if (
    /\b(another recomm\w*|something else|start over|start fresh|show me another|looking for|more ice|less ice|sweeter|different flavor)\b/i.test(
      text
    ) &&
    !/\b(thanks|thank you|appreciate|thats all|that is all|all set)\b/i.test(text)
  ) {
    return false;
  }
  if (
    /\b(disposable|e-?liquid|fruity|menthol)\b/i.test(text) &&
    !/\b(thanks|thank you|appreciate|thats all|that is all|all set|goodbye|bye)\b/i.test(text)
  ) {
    return false;
  }
  if (/\brecommend (another|something|a |an |me )\b/i.test(text)) {
    return false;
  }

  if (
    /^(ok|okay|alright|all right|cool|great|perfect|awesome|nice|yes|yeah|yep)?\s*(thanks|thank you)(\s+(so much|a lot|very much))?$/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /^(thanks|thank you)(\s+(so much|a lot|very much|for (your )?help|thats all|that is all|that will be all))?$/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(thanks|thank you)\b/.test(text) &&
    text.split(/\s+/).length <= 12 &&
    !/\b(another|different|recommend|looking for|more ice|less ice)\b/i.test(text)
  ) {
    return true;
  }
  if (/\b(appreciate it|appreciated|many thanks|thanks a bunch|thanks a ton)\b/.test(text)) {
    return true;
  }
  if (/\b(no thanks|no thank you|nah thanks|nope thanks|no thankyou)\b/.test(text)) {
    return true;
  }
  if (/^(no|nope|nah)\s+(thanks|thank you)$/.test(text)) {
    return true;
  }
  if (
    /\b(thats (all|it|perfect|great|fine|enough)|that is (all|it|perfect)|that will be all|im (good|done|all set|fine)|i am (good|done|all set|fine)|all good|all set|im all set)\b/.test(
      text
    )
  ) {
    return true;
  }
  if (/\b(goodbye|good bye|bye bye|bye|see you( later)?|take care|have a (good|great) (day|one))\b/.test(text)) {
    return true;
  }
  if (/^(perfect|awesome|great|sounds good|sounds perfect|all good)(\s+(thanks|thank you))?$/.test(text)) {
    return true;
  }

  return false;
}

/** Explicit restart / brand-new recommendation request */
export function detectsRecommendationRestart(message) {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return false;
  if (detectsConversationEnd(text)) return false;
  return (
    /\b(another recomm\w*|different (recommendation|product)|something else|start over|start fresh|new recomm\w*|show me another product|recommend another vape|completely different|for my friend)\b/i.test(
      text
    ) ||
    /\bi want (another|a different|something else)\b/i.test(text) ||
    /\bget another recomm\w*\b/i.test(text) ||
    /\bnow i want\b/i.test(text) ||
    /\blet'?s start (over|again|fresh)\b/i.test(text) ||
    /\bstart fresh\b/i.test(text)
  );
}

/** Relative tweaks to the current recommendation — do not clear Looking For */
export function detectsRecommendationRefine(message) {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return false;
  return /\b(more ice|less ice|extra ice|heavy ice|less cooling|more cooling|sweeter|less sweet|smoother|milder|another (flavor|variant|option)|different (flavor|variant|option)|something similar|don'?t like (this|that|the) flavor|make it (sweeter|icier|cooler|less sweet)|suggest another (variant|option|flavor))\b/i.test(
    text
  );
}

/**
 * True when the user is starting a fresh shopping pass (new product type / full ask)
 * rather than refining the current card.
 */
export function detectsNewRecommendationPass(message, previousIntent = null) {
  const text = String(message || '').trim();
  if (!text) return false;
  if (detectsRecommendationRestart(text)) return true;
  if (detectsRecommendationRefine(text)) return false;

  // Lazy import avoidance — product-type switch detected via simple keywords
  const lower = text.toLowerCase();
  const typeMatchers = [
    { key: 'disposable', re: /\bdisposables?\b/i },
    { key: 'e-liquid', re: /\b(e-?liquids?|e-?juice|eliquid|vape juice)\b/i },
    { key: 'pod', re: /\b(pods?|pod system)\b/i },
    { key: 'device', re: /\b(devices?|mods?|kits?)\b/i },
  ];
  const found = typeMatchers.find((t) => t.re.test(lower));
  if (found && previousIntent?.productType) {
    const prev = String(previousIntent.productType).toLowerCase();
    if (found.key === 'disposable' && !prev.includes('disposable')) return true;
    if (found.key === 'e-liquid' && !prev.includes('liquid') && !prev.includes('juice')) return true;
    if (found.key === 'pod' && !prev.includes('pod')) return true;
    if (found.key === 'device' && !prev.includes('device') && !prev.includes('mod')) return true;
  }

  // Fresh shopping opener after a recommendation
  if (
    /\b(i'?m looking for|i want|recommend|show me)\b/i.test(lower) &&
    (found || /\b(fruity|menthol|candy|dessert|citrus|mango|berry|ice|no ice)\b/i.test(lower))
  ) {
    return true;
  }

  return false;
}

export function formatUserChoice(option) {
  if (!option) return '';
  return option.label || option.value || '';
}

/**
 * Normalize API options (kept for compatibility).
 * The text-first UI no longer renders these as buttons.
 */
export function normalizeOptions(options = []) {
  if (!Array.isArray(options)) return [];
  return options
    .map((opt, idx) => ({
      id: String(opt.id || `opt_${idx}`),
      label: String(opt.label || opt.value || 'Option'),
      emoji: opt.emoji || '',
      value: opt.value || opt.label || '',
    }))
    .filter((o) => o.label);
}

/** Soften multi-line assistant replies for chat bubbles */
export function formatAssistantContent(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const BRAND_ASK_NO_EXAMPLES =
  'Do you have a preferred brand? If not, you can reply with "No Preference."';

const BRAND_PLACEHOLDER_RE =
  /^(n\/?a|none|unknown|null|undefined|tbd|n\.a\.?|not available|coming soon|-|—|–|\.)$/i;

const BRAND_TEST_RE =
  /\b(test|demo|sample|dummy|fake|placeholder|asdf|xxx|lorem|ipsum)\b|\(\s*(test|demo|sample)\s*\)/i;

const BRAND_DOMAIN_RE =
  /https?:\/\/|www\.|\.(com|ca|net|org|io|co|shop|store|dev|local)\b/i;

const BRAND_MERCHANT_RE =
  /\b(store|shop|official|website|online\s*store|retail(?:er)?|vape\s*shop|my\s*store)\b/i;

function foldBrandLabel(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function collectClientSiteBlocks(siteContext = null) {
  const blocks = new Set();
  if (!siteContext || typeof siteContext !== 'object') return blocks;

  const add = (raw) => {
    const folded = foldBrandLabel(raw);
    if (!folded || folded.length < 4) return;
    blocks.add(folded);
    blocks.add(folded.replace(/\s+/g, ''));
    const stripped = folded.replace(/^(test|demo|sample|fake)\s+/i, '').trim();
    if (stripped && stripped.length >= 4) {
      blocks.add(stripped);
      blocks.add(stripped.replace(/\s+/g, ''));
    }
  };

  add(siteContext.storeName);
  add(siteContext.name);

  const hostRaw = String(
    siteContext.allowedHostname || siteContext.websiteUrl || siteContext.productPageUrl || ''
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  if (hostRaw) {
    add(hostRaw);
    const labels = hostRaw.split('.').filter(Boolean);
    if (labels.length >= 2) {
      add(labels.slice(-2).join('.'));
      add(labels.length >= 3 ? labels[labels.length - 2] : labels[0]);
      add(labels.slice(-2).join(''));
    } else if (labels[0]) {
      add(labels[0]);
    }
  }

  return blocks;
}

/**
 * True when a brand bullet is safe to show in the embed / chat UI.
 * Mirrors backend inventory brand validation so store/domain/test names never appear.
 */
export function isDisplayableBrandSuggestion(raw, siteContext = null) {
  const brand = String(raw || '').trim();
  if (!brand || brand.length < 2 || brand.length > 60) return false;
  if (BRAND_PLACEHOLDER_RE.test(brand)) return false;
  if (BRAND_TEST_RE.test(brand)) return false;
  if (BRAND_DOMAIN_RE.test(brand)) return false;
  if (BRAND_MERCHANT_RE.test(brand)) return false;
  if (/^[0-9\W_]+$/.test(brand)) return false;

  const folded = foldBrandLabel(brand);
  if (!folded || folded.length < 2) return false;

  const compact = folded.replace(/\s+/g, '');
  if (/(?:^|[\s_-])(?:test|demo|sample)(?:$|[\s_-])/i.test(folded)) return false;
  if (/[a-z]{3,}(?:test|demo|sample)$/i.test(compact)) return false;
  if (/^(?:test|demo|sample)[a-z]{3,}$/i.test(compact)) return false;

  const siteBlocks = collectClientSiteBlocks(siteContext);
  for (const block of siteBlocks) {
    if (!block || block.length < 4) continue;
    if (folded === block || compact === block) return false;
    if (folded.startsWith(`${block} `) || folded.endsWith(` ${block}`)) return false;
    if (folded.includes(` ${block} `)) return false;
    if (
      compact.startsWith(block) &&
      /(?:test|demo|sample|shop|store|site|official)$/i.test(compact.slice(block.length))
    ) {
      return false;
    }
    if (
      compact.endsWith(block) &&
      /^(?:test|demo|sample|shop|store|my)/i.test(compact.slice(0, -block.length))
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize brand-preference prompts for the shared landing + embed chat UI.
 * Keeps legitimate inventory brand examples; strips store/domain/test lookalikes.
 */
export function rewriteBrandQuestion(text, siteContext = null) {
  const content = formatAssistantContent(text);
  if (!content || !isBrandQuestion(content)) return content;

  const lines = content.split('\n');
  const bullets = [];

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/);
    if (match) {
      bullets.push({ index: i, name: match[1].trim() });
    }
  }

  // No example list — leave the ask as-is (including the no-preference-only wording).
  if (!bullets.length) return content;

  // Only rewrite when bullets sit in a brand-preference ask (not unrelated lists).
  if (!/\b(for example|preferred brand|which brand|what brand)\b/i.test(content)) {
    return content;
  }

  const validExamples = [];
  const seen = new Set();
  for (const bullet of bullets) {
    if (!isDisplayableBrandSuggestion(bullet.name, siteContext)) continue;
    const key = foldBrandLabel(bullet.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    validExamples.push(bullet.name);
  }

  // Nothing to scrub
  if (validExamples.length === bullets.length) {
    return content;
  }

  const drop = new Set(bullets.map((b) => b.index));
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (/\bfor example\b/i.test(trimmed) && /\bbrand\b/i.test(trimmed)) drop.add(i);
    if (/^do you have a preferred brand\b/i.test(trimmed)) drop.add(i);
    if (/you can also name another brand/i.test(trimmed)) drop.add(i);
    if (/if not,.*(no preference|reply with)/i.test(trimmed)) drop.add(i);
  }

  const prefix = lines
    .filter((_, index) => !drop.has(index))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const ask =
    validExamples.length > 0
      ? [
          'Do you have a preferred brand? For example:',
          ...validExamples.map((name) => `• ${name}`),
          'You can also name another brand in stock, or reply with "No Preference."',
        ].join('\n')
      : BRAND_ASK_NO_EXAMPLES;

  return [prefix, ask].filter(Boolean).join('\n\n').trim();
}

/**
 * @deprecated Brand questions are part of the preference flow now.
 */
export function isBrandQuestion(text) {
  return /\b(which brand|what brand|preferred brand|select a brand|choose a brand|brand are you|manufacturer|which vendor)\b/i.test(
    String(text || '')
  );
}

/**
 * Strip interactive option chips from a restored timeline.
 * Age Yes/No is handled separately via welcome.ageActionsActive.
 */
export function stripInteractiveOptions(timeline = []) {
  return timeline.map((item) => {
    if (!item || typeof item !== 'object') return item;
    if (!item.options && !item.optionsActive) return item;
    const next = { ...item, optionsActive: false };
    delete next.options;
    return next;
  });
}
