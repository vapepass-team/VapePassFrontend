'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, X, Send, AlertTriangle, Minimize2 } from 'lucide-react';
import {
  getAssistantWidgetConfig,
  startAssistantSession,
  sendAssistantMessage,
  setEmbedParentOrigin,
} from '@/lib/assistant-public-api';
import {
  FLOW_STEPS,
  ANOTHER_REC_PROMPT,
  getAgeYesLabel,
  getShoppingWelcomeMessage,
  detectsRecommendationRestart,
  detectsRecommendationRefine,
  detectsNewRecommendationPass,
  detectsConversationEnd,
  normalizeOptions,
  stripInteractiveOptions,
  rewriteBrandQuestion,
  isNoBrandPreference,
  detectsUnderage,
} from '@/lib/chat/conversation-flow';
import {
  extractIntent,
  matchOptionWithNlu,
  buildEnrichedSearchMessage,
  formatLookingForBullets,
  formatLookingForFromPreferences,
  intentFromPreferences,
} from '@/lib/chat/nlu';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatLauncherNudge, {
  LAUNCHER_NUDGE_MESSAGES,
  LAUNCHER_NUDGE_SESSION_KEY,
  pickLauncherNudgeMessage,
} from '@/components/chat/ChatLauncherNudge';

/** Appear after load; stay ~7s; once per browser session after display. */
const NUDGE_SHOW_DELAY_MS = 1200;
const NUDGE_VISIBLE_MS = 8000;
const NUDGE_EXIT_MS = 280;

/** Prefer API reply text; if missing, turn option labels into a soft conversational prompt (no chips). */
function replyTextFromSession(session, siteContext = null) {
  const reply = rewriteBrandQuestion(session?.reply || '', siteContext);
  if (reply) return reply;
  const labels = normalizeOptions(session?.options)
    .map((o) => o.label)
    .filter(Boolean);
  if (!labels.length) return '';
  const preview = labels.slice(0, 6).join(', ');
  const more = labels.length > 6 ? ', and more' : '';
  return `Happy to help narrow it down. People often look for things like ${preview}${more}. What sounds closest to what you want?`;
}

/** Break long assistant paragraphs into shorter scan-friendly lines. */
function formatReadableAssistantReply(text, siteContext = null) {
  const raw = rewriteBrandQuestion(text, siteContext);
  if (!raw) return '';
  // Keep intentional newlines; also split dense sentences into shorter blocks.
  const chunks = raw
    .split(/\n+/)
    .flatMap((block) => {
      const trimmed = block.trim();
      if (!trimmed) return [''];
      if (trimmed.length < 120) return [trimmed];
      const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
      return sentences.map((s) => s.trim()).filter(Boolean);
    });
  return chunks.join('\n\n').trim();
}

const SESSION_KEY_PREFIX = 'vapepass_landing_session_';
const GUIDED_KEY_PREFIX = 'vapepass_guided_state_';

let msgId = 0;
function nextId() {
  msgId += 1;
  return `msg-${msgId}-${Date.now()}`;
}

function resolveStoreId(searchParams) {
  const fromUrl = searchParams.get('storeId') || searchParams.get('assistantStoreId');
  if (fromUrl) return fromUrl.trim();
  return (process.env.NEXT_PUBLIC_DEMO_STORE_ID || '').trim() || null;
}

function createWelcomeTimeline() {
  return [{ id: nextId(), kind: 'welcome', role: 'assistant', ageActionsActive: true }];
}

function deactivateInteractiveActions(timeline) {
  return timeline.map((item) => {
    if (!item.optionsActive && !item.ageActionsActive) return item;
    return {
      ...item,
      optionsActive: false,
      ageActionsActive: false,
    };
  });
}

function productFromApi(product) {
  if (!product) return null;
  const productUrl =
    (typeof product.productUrl === 'string' && product.productUrl.trim()) ||
    (typeof product.originalProductUrl === 'string' && product.originalProductUrl.trim()) ||
    '';
  return {
    name: product.name,
    brand: product.brand,
    flavor: product.flavor || null,
    variantName: product.variantName || null,
    description: product.description || null,
    imageUrl: product.imageUrl,
    productUrl,
  };
}

/** Canonical category key for "No Preference (keep category: …)" — never mix families. */
function lockedCategoryLabel(intentOrPrefs) {
  if (!intentOrPrefs) return null;
  // Only product-type locks — never flavor "category" fields like "Citrus"
  const raw = intentOrPrefs.productType || intentOrPrefs.lockedProductType || null;
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
  const map = {
    e_liquid: 'E-Liquid',
    eliquid: 'E-Liquid',
    'e-liquid': 'E-Liquid',
    disposable: 'Disposable',
    device: 'Device',
    pod: 'Pod System',
    pod_system: 'Pod System',
    prefilled: 'Prefilled Pod',
    prefilled_pod: 'Prefilled Pod',
    cartridge: 'Cartridge',
    accessory: 'Accessory',
    pouch: 'Nicotine Pouch',
    coil: 'Coil',
    battery: 'Battery',
  };
  if (map[key]) return map[key];
  // Already a display label from frontend NLU
  if (/e-?liquid/i.test(String(raw))) return 'E-Liquid';
  if (/disposable/i.test(String(raw))) return 'Disposable';
  if (/pre-?filled/i.test(String(raw))) return 'Prefilled Pod';
  if (/cartridge/i.test(String(raw))) return 'Cartridge';
  if (/pod/i.test(String(raw))) return 'Pod System';
  if (/device|kit/i.test(String(raw))) return 'Device';
  return String(raw);
}

/** Keep local preference memory aligned with the backend funnel lock. */
function syncPreferenceIntentFromSession(session, preferenceIntentRef) {
  const prefs = session?.funnelState?.preferences;
  const locked =
    session?.funnelState?.lockedProductType || prefs?.productType || null;
  if (!locked) return;

  const fromPrefs = intentFromPreferences(prefs || { productType: locked });
  const prev = preferenceIntentRef.current || {};
  preferenceIntentRef.current = {
    ...prev,
    ...(fromPrefs || {}),
    productType:
      fromPrefs?.productType ||
      lockedCategoryLabel({ productType: locked }) ||
      prev.productType ||
      null,
  };
}

export default function LandingChatWidget({
  storeId: storeIdProp = null,
  embedMode = false,
  parentOrigin = null,
} = {}) {
  const searchParams = useSearchParams();
  const storeId = (storeIdProp && String(storeIdProp).trim()) || resolveStoreId(searchParams);

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeExiting, setNudgeExiting] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState(LAUNCHER_NUDGE_MESSAGES[0]);
  const nudgeEnabledRef = useRef(true);
  const [config, setConfig] = useState(null);
  const [sessionKey, setSessionKey] = useState(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [locked, setLocked] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [flowStep, setFlowStep] = useState(FLOW_STEPS.AGE_VERIFY);
  const [timeline, setTimeline] = useState(createWelcomeTimeline);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [recommendedProduct, setRecommendedProduct] = useState(null);

  const messagesEndRef = useRef(null);
  const bootstrappedRef = useRef(false);
  /** Last options from API — used only to map free text → ::option::id; never rendered as chips. */
  const lastApiOptionsRef = useRef([]);
  /** Accumulated preference intent for structured recommendation cards. */
  const preferenceIntentRef = useRef(null);
  const preferenceMessagesRef = useRef([]);
  /** Store/site tokens for scrubbing fake brand examples in embed + landing chat. */
  const brandSiteContextRef = useRef(null);

  const storageKey = storeId ? `${SESSION_KEY_PREFIX}${storeId}` : null;
  const guidedKey = storeId ? `${GUIDED_KEY_PREFIX}${storeId}` : null;

  useEffect(() => {
    if (!embedMode) return undefined;
    setEmbedParentOrigin(parentOrigin);
    return () => setEmbedParentOrigin(null);
  }, [embedMode, parentOrigin]);

  useEffect(() => {
    brandSiteContextRef.current = config
      ? {
          storeName: config.storeName || null,
          allowedHostname: config.allowedHostname || null,
        }
      : null;
  }, [config]);

  // Set parent origin synchronously so the first config request includes the header.
  if (embedMode && typeof window !== 'undefined') {
    setEmbedParentOrigin(parentOrigin);
  }

  /** Tell the host-page iframe loader how large to size the frame (FAB vs open panel). */
  useEffect(() => {
    if (!embedMode || typeof window === 'undefined') return;
    const targetOrigin = parentOrigin || '*';
    let width = 88;
    let height = 88;
    if (open && minimized) {
      width = 420;
      height = 120;
    } else if (open) {
      width = 420;
      height = 720;
    } else if (nudgeVisible || nudgeExiting) {
      // Room for the invite bubble above the FAB
      width = 340;
      height = 168;
    }
    window.parent.postMessage(
      { source: 'vapepass-assistant', type: 'resize', width, height },
      targetOrigin
    );
  }, [embedMode, parentOrigin, open, minimized, nudgeVisible, nudgeExiting]);

  // Invite bubble above the FAB (presentation only).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    try {
      if (sessionStorage.getItem(LAUNCHER_NUDGE_SESSION_KEY) === '1') {
        nudgeEnabledRef.current = false;
        return undefined;
      }
    } catch {
      /* ignore */
    }

    setNudgeMessage(pickLauncherNudgeMessage());

    const showId = window.setTimeout(() => {
      if (!nudgeEnabledRef.current) return;
      setNudgeVisible(true);
      setNudgeExiting(false);
    }, NUDGE_SHOW_DELAY_MS);

    return () => window.clearTimeout(showId);
  }, []);

  useEffect(() => {
    if (!nudgeVisible || open) return undefined;

    const hideId = window.setTimeout(() => {
      setNudgeExiting(true);
      window.setTimeout(() => {
        setNudgeVisible(false);
        setNudgeExiting(false);
        // Do not mark session on auto-hide — tip can greet again on next visit
        // until the user opens or dismisses the launcher.
      }, NUDGE_EXIT_MS);
    }, NUDGE_VISIBLE_MS);

    return () => window.clearTimeout(hideId);
  }, [nudgeVisible, open]);

  useEffect(() => {
    if (!open) return;
    nudgeEnabledRef.current = false;
    setNudgeVisible(false);
    setNudgeExiting(false);
    try {
      sessionStorage.setItem(LAUNCHER_NUDGE_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }, [open]);

  const dismissLauncherNudge = useCallback(() => {
    nudgeEnabledRef.current = false;
    setNudgeExiting(true);
    window.setTimeout(() => {
      setNudgeVisible(false);
      setNudgeExiting(false);
    }, NUDGE_EXIT_MS);
    try {
      sessionStorage.setItem(LAUNCHER_NUDGE_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const appendTimeline = useCallback((items) => {
    setTimeline((prev) => [...prev, ...(Array.isArray(items) ? items : [items])]);
  }, []);  useEffect(() => {
    if (!guidedKey || !bootstrappedRef.current) return;
    try {
      sessionStorage.setItem(
        guidedKey,
        JSON.stringify({ step: flowStep, timeline, recommendedProduct, currentOptions })
      );
    } catch {
      /* ignore */
    }
  }, [guidedKey, flowStep, timeline, recommendedProduct, currentOptions]);

  const applySession = useCallback(
    (session) => {
      setSessionKey(session.sessionKey);
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, session.sessionKey);
        } catch {
          /* ignore */
        }
      }
      setAgeVerified(Boolean(session.ageVerified));
      setLocked(Boolean(session.locked));

      if (session.recommendationRestart) {
        preferenceIntentRef.current = null;
        preferenceMessagesRef.current = [];
      } else {
        syncPreferenceIntentFromSession(session, preferenceIntentRef);
      }

      if (session.locked) {
        setFlowStep(FLOW_STEPS.LOCKED);
        setCurrentOptions([]);
      }
    },
    [storageKey]
  );

  const applyGuidedReply = useCallback(
    (session, { appendAssistantText = true, prependMessages = [] } = {}) => {
      const siteContext = brandSiteContextRef.current;
      const replyType = session.replyType || 'text';
      const reply = formatReadableAssistantReply(
        replyTextFromSession(session, siteContext),
        siteContext
      );
      const optionList = normalizeOptions(session.options);
      lastApiOptionsRef.current = optionList;

      // Text-first UX: never attach selectable option chips after age verification.
      // Backend may still return options for funnel logic; we only show conversational text + product cards.

      const hasProductCard =
        !session.recommendationRestart &&
        !session.conversationEnded &&
        (replyType === 'recommendation' ||
          (Array.isArray(session.products) && session.products.length > 0)) &&
        Boolean(session.products?.[0]);

      if (hasProductCard) {
        const apiProduct = session.products[0];
        const product = productFromApi(apiProduct);
        const matchIntent = preferenceIntentRef.current;
        const prefsLookingFor = formatLookingForFromPreferences(
          session.funnelState?.preferences
        );
        const lookingFor =
          prefsLookingFor.length > 0
            ? prefsLookingFor
            : formatLookingForBullets(matchIntent, preferenceMessagesRef.current);
        const reasonsIntent =
          intentFromPreferences(session.funnelState?.preferences) || matchIntent;
        // Only real product/flavor labels — never action chips like "Get Another Recommendation"
        const actionLabelRe =
          /\b(get another|another recommendation|something else|start over|view product)\b/i;
        const variants = [
          ...new Set(
            [
              ...(Array.isArray(session.products)
                ? session.products
                    .map((p) => p.variantName || p.flavor)
                    .filter(Boolean)
                : []),
              product?.variantName,
              product?.flavor,
              ...optionList
                .map((o) => o.label)
                .filter((label) => label && !actionLabelRe.test(String(label))),
            ].filter(Boolean)
          ),
        ].slice(0, 12);

        setTimeline((prev) => {
          const cleared = [
            ...deactivateInteractiveActions(prev),
            ...prependMessages,
          ];
          const items = [...cleared];
          if (product) {
            items.push({
              id: nextId(),
              kind: 'product',
              role: 'assistant',
              intro: reply,
              product,
              disclaimer: null,
              lookingFor,
              variants,
              matchIntent: reasonsIntent,
            });
            items.push({
              id: nextId(),
              kind: 'text',
              role: 'assistant',
              content: ANOTHER_REC_PROMPT,
            });
          } else if (reply) {
            items.push({
              id: nextId(),
              kind: 'text',
              role: 'assistant',
              content: reply,
            });
          }
          return items;
        });

        setRecommendedProduct(product);
        setCurrentOptions([]);
        setFlowStep(FLOW_STEPS.RECOMMENDATION);
        return;
      }

      // options / text / free chat — render as normal assistant bubbles only
      setTimeline((prev) => {
        const cleared = [
          ...deactivateInteractiveActions(prev),
          ...prependMessages,
        ];
        if (!(appendAssistantText && reply)) return cleared;
        return [
          ...cleared,
          {
            id: nextId(),
            kind: 'text',
            role: 'assistant',
            content: reply,
          },
        ];
      });
      setCurrentOptions([]);
      if (session.recommendationRestart) {
        setRecommendedProduct(null);
      } else {
        setRecommendedProduct(null);
      }
      setFlowStep(session.locked ? FLOW_STEPS.LOCKED : FLOW_STEPS.FREE_CHAT);
    },
    []
  );

  const bootstrap = useCallback(async () => {
    if (!storeId) {
      setError(
        'Set NEXT_PUBLIC_DEMO_STORE_ID in frontend/.env.local or add ?storeId=YOUR_STORE_ID to the URL.'
      );
      bootstrappedRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const widgetConfig = await getAssistantWidgetConfig(storeId);
      setConfig(widgetConfig);

      if (!widgetConfig.enabled) {
        const reason = widgetConfig.disabledReason;
        const allowed = widgetConfig.allowedHostname;
        setError(
          reason === 'unauthorized_domain'
            ? embedMode
              ? allowed
                ? `This chatbot is only authorized for ${allowed}. Change the authorized domain in your VapePass Dashboard (or AI Assistant page), or open the embed on that domain.`
                : 'This chatbot is not authorized for this website. Set an authorized domain in the VapePass Dashboard.'
              : 'This demo chatbot is not authorized for this domain. Set CLIENT_URL on the API to your Vercel URL (e.g. https://projectclient-zeta.vercel.app).'
            : reason === 'no_inventory'
              ? 'No recommendable products are available yet. Sync store inventory in the dashboard.'
              : 'Assistant is not live for this store yet. Complete setup, sync inventory, and ensure your subscription is active.'
        );
        return;
      }

      let existingKey = null;
      if (storageKey) {
        try {
          existingKey = sessionStorage.getItem(storageKey);
        } catch {
          /* ignore */
        }
      }

      const session = await startAssistantSession(storeId, existingKey || undefined);
      applySession(session);

      let restoredGuided = false;
      if (guidedKey) {
        try {
          const saved = sessionStorage.getItem(guidedKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.timeline?.length) {
              let restored = stripInteractiveOptions(parsed.timeline);
              if (session.ageVerified) {
                restored = restored.map((item) => ({ ...item, ageActionsActive: false }));
              }

              setTimeline(restored);
              setRecommendedProduct(parsed.recommendedProduct || null);
              setCurrentOptions([]);
              if (!session.locked) {
                setFlowStep(
                  session.ageVerified
                    ? FLOW_STEPS.FREE_CHAT
                    : FLOW_STEPS.AGE_VERIFY
                );
              }
              restoredGuided = true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!restoredGuided && session.ageVerified && !session.locked) {
        setTimeline((prev) => deactivateInteractiveActions(prev));
        setFlowStep(FLOW_STEPS.FREE_CHAT);
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to VapePass Assistant');
    } finally {
      bootstrappedRef.current = true;
      setLoading(false);
    }
  }, [storeId, storageKey, guidedKey, applySession, embedMode]);

  useEffect(() => {
    if (open && !bootstrappedRef.current && !loading) {
      bootstrap();
    }
  }, [open, bootstrap, loading]);

  useEffect(() => {
    if (open && !minimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, open, minimized, sending, flowStep, currentOptions]);

  const submitMessage = useCallback(
    async (text, { silent = false } = {}) => {
      const trimmed = text.trim();
      if (!trimmed || locked || sending || !storeId || !sessionKey) return null;

      setSending(true);
      setInput('');

      if (!silent) {
        appendTimeline({
          id: nextId(),
          kind: 'text',
          role: 'user',
          content: trimmed,
        });
      }

      const intent = extractIntent(trimmed);
      const nluHit = matchOptionWithNlu(trimmed, lastApiOptionsRef.current);
      const prevIntent = preferenceIntentRef.current;
      const isClosing = detectsConversationEnd(trimmed);
      const isNoBrandPref = isNoBrandPreference(trimmed);
      const legalAgeNow = config?.legalAge ?? 19;
      const isUnderageAdmission = detectsUnderage(trimmed, legalAgeNow);

      // Never enrich or accumulate prefs for polite closings — send plain text only
      if (isClosing) {
        preferenceIntentRef.current = null;
        preferenceMessagesRef.current = [];
      }

      // Underage admission — do not enrich or carry shopping preferences
      if (isUnderageAdmission) {
        preferenceIntentRef.current = null;
        preferenceMessagesRef.current = [];
        setRecommendedProduct(null);
      }

      const productTypeSwitched = Boolean(
        !isClosing &&
          !isUnderageAdmission &&
          !isNoBrandPref &&
          intent.productType &&
          prevIntent?.productType &&
          intent.productType !== prevIntent.productType
      );
      // Only treat as a brand-new pass after a completed card, or when product type flips
      const afterCompletedRecommendation = Boolean(recommendedProduct);
      const startNewPass =
        !isClosing &&
        !isUnderageAdmission &&
        !isNoBrandPref &&
        (productTypeSwitched ||
          (afterCompletedRecommendation &&
            detectsNewRecommendationPass(trimmed, prevIntent) &&
            !detectsRecommendationRefine(trimmed)) ||
          (detectsRecommendationRestart(trimmed) && !detectsRecommendationRefine(trimmed)));

      if (!isClosing && !isUnderageAdmission && startNewPass) {
        // Brand-new recommendation pass — clear Looking For / preference memory
        preferenceMessagesRef.current = intent.lookingFor?.length || intent.productType ? [trimmed] : [];
        preferenceIntentRef.current =
          intent.lookingFor?.length || intent.productType || intent.flavor || intent.cooling
            ? { ...intent }
            : null;
        if (afterCompletedRecommendation) {
          setRecommendedProduct(null);
        }
      } else if (!isClosing && !isUnderageAdmission && isNoBrandPref && prevIntent?.productType) {
        // Keep the locked category — "No Preference" is brand-only, never a category switch
        preferenceIntentRef.current = {
          ...prevIntent,
          productType: prevIntent.productType,
        };
      } else if (
        !isClosing &&
        !isUnderageAdmission &&
        (nluHit || intent.lookingFor?.length)
      ) {
        preferenceMessagesRef.current = [...preferenceMessagesRef.current, trimmed].slice(-12);
        preferenceIntentRef.current = {
          ...intent,
          lookingFor: [
            ...new Set([...(prevIntent?.lookingFor || []), ...(intent.lookingFor || [])]),
          ].slice(0, 10),
          excludes: [
            ...new Set([...(prevIntent?.excludes || []), ...(intent.excludes || [])]),
          ],
          productType: intent.productType || prevIntent?.productType || null,
          flavor: intent.flavor || prevIntent?.flavor || null,
          category: intent.category || prevIntent?.category || null,
          cooling: intent.cooling || prevIntent?.cooling || null,
          sweetness: intent.sweetness || prevIntent?.sweetness || null,
        };
      }

      const matched =
        !isClosing && !isUnderageAdmission && nluHit?.option ? nluHit.option : null;
      let outbound;
      if (matched) {
        outbound = `::option::${matched.id}`;
      } else if (isClosing || isUnderageAdmission) {
        // Send plain text so backend underage/end detectors see the raw admission
        outbound = trimmed;
      } else if (isNoBrandPref) {
        // Explicitly keep category in the outbound payload so the backend cannot drift
        const lockedType = lockedCategoryLabel(
          preferenceIntentRef.current || prevIntent || null
        );
        outbound = lockedType
          ? `No Preference (any brand, keep category: ${lockedType})`
          : 'No Preference';
      } else {
        outbound = buildEnrichedSearchMessage(trimmed, preferenceIntentRef.current);
      }

      try {
        const session = await sendAssistantMessage(storeId, sessionKey, outbound);
        applySession(session);
        if (!session.locked) {
          applyGuidedReply(
            isClosing || session.conversationEnded
              ? {
                  ...session,
                  conversationEnded: true,
                  products: [],
                  replyType: 'text',
                  options: [],
                }
              : session
          );
          if (isClosing || session.conversationEnded) {
            setRecommendedProduct(null);
          }
        } else {
          const lockContent =
            session.reply ||
            session.messages?.[session.messages.length - 1]?.content ||
            config?.lockMessage ||
            'This conversation has ended.';
          preferenceIntentRef.current = null;
          preferenceMessagesRef.current = [];
          setRecommendedProduct(null);
          setTimeline((prev) => [
            ...deactivateInteractiveActions(prev),
            {
              id: nextId(),
              kind: 'text',
              role: 'assistant',
              content: lockContent,
              variant: 'locked',
            },
          ]);
          setFlowStep(FLOW_STEPS.LOCKED);
          setCurrentOptions([]);
        }
        return session;
      } catch (err) {
        appendTimeline({
          id: nextId(),
          kind: 'text',
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
        });
        return null;
      } finally {
        setSending(false);
      }
    },
    [
      locked,
      sending,
      storeId,
      sessionKey,
      applySession,
      appendTimeline,
      applyGuidedReply,
      recommendedProduct,
      config,
    ]
  );

  const legalAge = config?.legalAge ?? 19;
  const ageYesLabel = config?.ageYesLabel ?? getAgeYesLabel(legalAge);

  const handleAgeYes = async () => {
    preferenceIntentRef.current = null;
    preferenceMessagesRef.current = [];
    setTimeline((prev) => [
      ...deactivateInteractiveActions(prev),
      {
        id: nextId(),
        kind: 'text',
        role: 'user',
        content: 'Yes',
      },
    ]);
    setSending(true);
    try {
      // Backend still receives the compliance age-affirmation phrase
      const session = await sendAssistantMessage(storeId, sessionKey, ageYesLabel);
      applySession(session);
      if (!session.locked) {
        applyGuidedReply(session, {
          prependMessages: [
            {
              id: nextId(),
              kind: 'text',
              role: 'assistant',
              content: getShoppingWelcomeMessage(config?.storeName),
            },
          ],
        });
      }
    } catch (err) {
      appendTimeline({
        id: nextId(),
        kind: 'text',
        role: 'assistant',
        content: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleAgeNo = async () => {
    setTimeline((prev) => [
      ...deactivateInteractiveActions(prev),
      {
        id: nextId(),
        kind: 'text',
        role: 'user',
        content: 'No',
      },
    ]);
    setSending(true);
    try {
      const session = await sendAssistantMessage(storeId, sessionKey, 'No');
      applySession(session);
      if (session.locked) {
        setFlowStep(FLOW_STEPS.LOCKED);
        const lockContent =
          session.reply ||
          session.messages?.[session.messages.length - 1]?.content ||
          'This conversation has ended.';
        appendTimeline({
          id: nextId(),
          kind: 'text',
          role: 'assistant',
          content: lockContent,
          variant: 'locked',
        });
        setTimeout(() => setOpen(false), 1200);
      }
    } catch (err) {
      appendTimeline({
        id: nextId(),
        kind: 'text',
        role: 'assistant',
        content: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleAnotherRecommendation = async () => {
    setRecommendedProduct(null);
    preferenceIntentRef.current = null;
    preferenceMessagesRef.current = [];
    setCurrentOptions([]);
    setTimeline((prev) => [
      ...deactivateInteractiveActions(prev),
      {
        id: nextId(),
        kind: 'text',
        role: 'user',
        content: 'I want another recommendation',
      },
    ]);
    setSending(true);
    try {
      const session = await sendAssistantMessage(
        storeId,
        sessionKey,
        'I want another recommendation'
      );
      applySession(session);
      // Force discovery-only UI — never render a product card on restart
      applyGuidedReply({
        ...session,
        recommendationRestart: true,
        products: [],
        replyType: 'text',
        options: [],
      });
    } catch (err) {
      appendTimeline({
        id: nextId(),
        kind: 'text',
        role: 'assistant',
        content: err.message || 'Something went wrong. Please try again.',
      });
      setFlowStep(FLOW_STEPS.FREE_CHAT);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Closings like "thanks" / "thank you" — never treat as another recommendation
    if (detectsConversationEnd(text)) {
      preferenceIntentRef.current = null;
      preferenceMessagesRef.current = [];
      setInput('');
      setCurrentOptions([]);
      setTimeline((prev) => [
        ...deactivateInteractiveActions(prev),
        {
          id: nextId(),
          kind: 'text',
          role: 'user',
          content: text,
        },
      ]);
      setSending(true);
      try {
        const session = await sendAssistantMessage(storeId, sessionKey, text);
        applySession(session);
        applyGuidedReply({
          ...session,
          conversationEnded: true,
          products: [],
          replyType: 'text',
          options: [],
        });
        setRecommendedProduct(null);
      } catch (err) {
        appendTimeline({
          id: nextId(),
          kind: 'text',
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
        });
      } finally {
        setSending(false);
      }
      return;
    }

    if (detectsRecommendationRestart(text) && !detectsRecommendationRefine(text)) {
      preferenceIntentRef.current = null;
      preferenceMessagesRef.current = [];
      setRecommendedProduct(null);
      setInput('');
      setCurrentOptions([]);
      setTimeline((prev) => [
        ...deactivateInteractiveActions(prev),
        {
          id: nextId(),
          kind: 'text',
          role: 'user',
          content: text,
        },
      ]);
      setSending(true);
      try {
        const session = await sendAssistantMessage(storeId, sessionKey, text);
        applySession(session);
        applyGuidedReply({
          ...session,
          recommendationRestart: true,
          products: [],
          replyType: 'text',
          options: [],
        });
      } catch (err) {
        appendTimeline({
          id: nextId(),
          kind: 'text',
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
        });
      } finally {
        setSending(false);
      }
      return;
    }

    setCurrentOptions([]);
    setTimeline((prev) => deactivateInteractiveActions(prev));
    await submitMessage(text);
  };

  const healthWarning =
    config?.healthWarning ||
    `Vaping products contain nicotine, which is addictive. For adults ${legalAge}+ only.`;

  const showAgeGate =
    flowStep === FLOW_STEPS.AGE_VERIFY && !ageVerified && !locked && !loading && !error && sessionKey;

  // After age verification, composer stays available for free-text chat (including after recommendations).
  const showComposer = Boolean(sessionKey) && ageVerified && !loading;

  const handleOpen = () => {
    nudgeEnabledRef.current = false;
    setNudgeVisible(false);
    setNudgeExiting(false);
    try {
      sessionStorage.setItem(LAUNCHER_NUDGE_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(true);
    setMinimized(false);
  };

  const handleClose = () => {
    setOpen(false);
    setMinimized(false);
  };

  const showLauncherNudge = !open && (nudgeVisible || nudgeExiting);

  return (
    <>
      {open && minimized && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 chat-widget-header chat-widget-panel w-[min(380px,calc(100vw-2rem))] px-4 py-3.5 flex items-center justify-between gap-3 rounded-[24px] animate-fade-in"
          role="region"
          aria-label="Minimized chat"
        >
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
            aria-label="Restore chat"
          >
            <div className="w-8 h-8 rounded-full chat-widget-header-icon flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] text-white tracking-[-0.01em] truncate">
                AI Shopping Assistant
              </p>
              <p className="text-[11px] text-white/75 truncate">Powered by VapePass</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {open && !minimized && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(380px,calc(100vw-2rem))] bg-white rounded-[24px] chat-widget-panel flex flex-col overflow-hidden animate-fade-in h-[min(560px,calc(100vh-7rem))] max-h-[min(560px,calc(100vh-7rem))]"
          role="dialog"
          aria-label="AI Shopping Assistant"
        >
          <div className="chat-widget-header px-4 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full chat-widget-header-icon flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] text-white tracking-[-0.01em] leading-tight">
                  AI Shopping Assistant
                </p>
                <p className="text-[12px] text-purple-200 mt-0.5 leading-tight">Powered by VapePass</p>
                {(config?.regionLabel || config?.legalAge) && (
                  <p className="text-[11px] text-purple-100/90 mt-0.5 leading-tight">
                    {[config?.regionLabel, config?.legalAge ? `Minimum Age: ${config.legalAge}+` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 size={17} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div
            className="chat-widget-warning px-4 py-2.5 flex items-start gap-2 text-[12px] leading-snug font-medium flex-shrink-0"
            role="note"
          >
            <AlertTriangle
              size={13}
              className="text-amber-600 flex-shrink-0 mt-0.5"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            <span>{healthWarning}</span>
          </div>

          {error && (
            <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-danger-50 border border-red-200 text-danger-600 text-xs flex gap-2 items-start flex-shrink-0">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div
            className="chat-widget-messages overflow-y-auto px-4 py-4 bg-white space-y-3 flex-1"
            role="log"
            aria-live="polite"
          >
            {loading && (
              <p className="text-center text-sm text-[#9ca3af] py-8">Loading live assistant…</p>
            )}
            {!loading && (
              <ChatMessageList
                timeline={timeline}
                sending={sending}
                legalAge={legalAge}
                showAgeActions={showAgeGate}
                onAgeYes={handleAgeYes}
                onAgeNo={handleAgeNo}
              />
            )}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {showComposer && (
            <>
              <p className="px-4 py-2 text-[11px] text-[#9ca3af] border-t border-[#f3f4f6] bg-white flex-shrink-0">
                {locked
                  ? 'Conversation locked'
                  : `Shopping from ${config?.storeName || 'store'} inventory only`}
              </p>
              <form
                onSubmit={handleSend}
                className="flex gap-2 px-4 pb-4 pt-1 bg-white flex-shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    locked ? 'Conversation ended' : "Tell me what you're looking for…"
                  }
                  disabled={locked || sending || loading || Boolean(error) || !sessionKey}
                  maxLength={2000}
                  className="chat-widget-input flex-1 h-11 px-4 text-[13px] text-[#1f2937] placeholder:text-[#9ca3af] disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
                />
                <button
                  type="submit"
                  disabled={
                    locked || sending || loading || Boolean(error) || !input.trim() || !sessionKey
                  }
                  className="chat-widget-send h-11 w-11 flex items-center justify-center text-white disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {showLauncherNudge && (
        <ChatLauncherNudge
          visible={nudgeVisible}
          exiting={nudgeExiting}
          message={nudgeMessage}
          onOpen={handleOpen}
          onDismiss={dismissLauncherNudge}
        />
      )}

      <button
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        className={[
          'fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full chat-widget-header hero-fab',
          'flex items-center justify-center text-white transition-all duration-200',
          'hover:scale-105 hover:brightness-110 active:scale-100',
          showLauncherNudge ? 'chat-launcher-fab--pulse' : '',
        ].join(' ')}
        aria-label={open ? 'Close AI Shopping Assistant' : 'Open AI Shopping Assistant'}
        aria-expanded={open}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Sparkles size={22} aria-hidden="true" />}
      </button>
    </>
  );
}
