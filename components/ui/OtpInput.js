'use client';

import { useRef } from 'react';

/**
 * Segmented one-time-code input. Supports typing, paste, arrow keys, and
 * backspace across boxes.
 */
export default function OtpInput({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
  label = 'Verification code',
}) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const focusAt = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  const emit = (next) => onChange(next.join('').slice(0, length));

  const updateDigit = (index, char) => {
    const next = digits.slice();
    next[index] = char;
    emit(next);
  };

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      updateDigit(index, '');
      return;
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, length - index).split('');
      const next = digits.slice();
      chars.forEach((c, offset) => {
        next[index + offset] = c;
      });
      emit(next);
      focusAt(Math.min(index + chars.length, length - 1));
      return;
    }

    updateDigit(index, cleaned);
    if (index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      updateDigit(index - 1, '');
      focusAt(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) focusAt(index - 1);
    if (e.key === 'ArrowRight' && index < length - 1) focusAt(index + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, length) - 1);
  };

  return (
    <div
      className="flex justify-center gap-2 sm:gap-2.5"
      onPaste={handlePaste}
      role="group"
      aria-label={label}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={[
            'w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-semibold rounded-xl border bg-surface text-ink',
            'focus:outline-none focus:ring-[3px] transition-all',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
              : 'border-line focus:border-brand-500 focus:ring-brand-500/15',
            disabled ? 'opacity-60' : '',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
