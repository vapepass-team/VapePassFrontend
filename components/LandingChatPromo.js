'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import ChatLauncherNudge, {
  LAUNCHER_NUDGE_MESSAGES,
  LAUNCHER_NUDGE_SESSION_KEY,
  pickLauncherNudgeMessage,
} from '@/components/chat/ChatLauncherNudge';

/**
 * Landing-only promo shell: same FAB look as the store chatbot, but opens a
 * signup/signin CTA instead of a live conversation.
 */
export default function LandingChatPromo() {
  const [open, setOpen] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeExiting, setNudgeExiting] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState(LAUNCHER_NUDGE_MESSAGES[0]);
  const nudgeEnabledRef = useRef(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LAUNCHER_NUDGE_SESSION_KEY) === '1') {
        nudgeEnabledRef.current = false;
        return undefined;
      }
    } catch {
      /* ignore */
    }

    setNudgeMessage(pickLauncherNudgeMessage());
    const showTimer = window.setTimeout(() => {
      if (!nudgeEnabledRef.current) return;
      setNudgeVisible(true);
    }, 1400);

    return () => window.clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!nudgeVisible || open) return undefined;
    const hideTimer = window.setTimeout(() => {
      setNudgeExiting(true);
      window.setTimeout(() => {
        setNudgeVisible(false);
        setNudgeExiting(false);
      }, 280);
    }, 8000);
    return () => window.clearTimeout(hideTimer);
  }, [nudgeVisible, open]);

  const dismissLauncherNudge = () => {
    nudgeEnabledRef.current = false;
    setNudgeVisible(false);
    setNudgeExiting(false);
    try {
      sessionStorage.setItem(LAUNCHER_NUDGE_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleOpen = () => {
    nudgeEnabledRef.current = false;
    setNudgeVisible(false);
    setNudgeExiting(false);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const showLauncherNudge = !open && (nudgeVisible || nudgeExiting);

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(380px,calc(100vw-2rem))] bg-white rounded-[24px] chat-widget-panel flex flex-col overflow-hidden animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-chat-promo-title"
          aria-describedby="landing-chat-promo-desc"
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
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-6 sm:px-6 sm:py-7 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={18} className="text-brand-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="landing-chat-promo-title"
                  className="text-[17px] sm:text-lg font-bold text-ink tracking-tight leading-snug"
                >
                  Get Your Own AI Shopping Assistant
                </h2>
                <p
                  id="landing-chat-promo-desc"
                  className="mt-2 text-sm text-body leading-relaxed"
                >
                  Sign up to create your account and unlock your personalized AI chatbot for your
                  store.
                </p>
                <p className="mt-2 text-sm text-body leading-relaxed">
                  Already have an account? Sign in to access your dashboard.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold text-white bg-[#7c3aed] hover:brightness-110 transition-all"
              >
                Get Started
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold text-ink border border-line bg-white hover:bg-surface transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
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
        aria-label={open ? 'Close AI Shopping Assistant promo' : 'Open AI Shopping Assistant promo'}
        aria-expanded={open}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Sparkles size={22} aria-hidden="true" />}
      </button>
    </>
  );
}
