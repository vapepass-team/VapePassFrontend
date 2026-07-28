'use client';

import { Sparkles, X } from 'lucide-react';

export const LAUNCHER_NUDGE_MESSAGES = [
  'Feeling overwhelmed by all the flavors? Let me help you find the perfect one 👀',
];

export const LAUNCHER_NUDGE_SESSION_KEY = 'vapepass_launcher_nudge_v3';

/**
 * Invite bubble above the chat FAB. Presentation only — does not change chat logic.
 */
export default function ChatLauncherNudge({
  visible,
  exiting = false,
  message,
  onOpen,
  onDismiss,
}) {
  if (!visible && !exiting) return null;

  return (
    <div
      className={[
        'chat-launcher-nudge',
        exiting ? 'chat-launcher-nudge--out' : 'chat-launcher-nudge--in',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="chat-launcher-nudge-body"
        onClick={onOpen}
        aria-label={`${message} Open AI Shopping Assistant`}
      >
        <span className="chat-launcher-nudge-icon" aria-hidden="true">
          <Sparkles size={14} strokeWidth={2.25} />
        </span>
        <span className="chat-launcher-nudge-text">{message}</span>
      </button>
      <button
        type="button"
        className="chat-launcher-nudge-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss?.();
        }}
        aria-label="Dismiss tip"
      >
        <X size={14} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <span className="chat-launcher-nudge-arrow" aria-hidden="true" />
    </div>
  );
}

export function pickLauncherNudgeMessage() {
  const list = LAUNCHER_NUDGE_MESSAGES;
  return list[Math.floor(Math.random() * list.length)] || list[0];
}
