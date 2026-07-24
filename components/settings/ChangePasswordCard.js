'use client';

import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import OtpInput from '@/components/ui/OtpInput';
import {
  Input,
  FormField,
  InputGroup,
  InputIcon,
  InputToggle,
} from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { requestPasswordChange, confirmPasswordChange } from '@/lib/auth-api';
import { ApiError, fieldErrorsToMap, setToken } from '@/lib/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Two-step password change: verify the current password, then confirm an OTP
 * emailed to the registered address.
 */
export default function ChangePasswordCard({ onNotify }) {
  const { user } = useAuth();

  const [stage, setStage] = useState('form');
  const [form, setForm] = useState(EMPTY_FORM);
  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const notify = (message, variant) => onNotify?.(message, variant);

  const setField = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors._form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next._form;
        return next;
      });
    }
  };

  const toggle = (field) => () =>
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  const readError = (err, fallback) => {
    if (err instanceof ApiError) {
      const fieldErrors = fieldErrorsToMap(err.errors);
      return {
        message: err.message || fallback,
        fieldErrors,
      };
    }
    return { message: fallback, fieldErrors: {} };
  };

  const validate = () => {
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Current password is required';

    if (!form.newPassword) next.newPassword = 'New password is required';
    else if (form.newPassword.length < 8) {
      next.newPassword = 'Password must be at least 8 characters';
    } else if (!PASSWORD_RULE.test(form.newPassword)) {
      next.newPassword = 'Password must contain uppercase, lowercase, and a number';
    } else if (form.newPassword === form.currentPassword) {
      next.newPassword = 'New password must be different from the current password';
    }

    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your new password';
    else if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const sendCode = async ({ isResend = false } = {}) => {
    if (isResend) setResending(true);
    else setSubmitting(true);

    try {
      await requestPasswordChange(
        form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );
      setStage('otp');
      setOtp('');
      setErrors({});
      setCooldown(RESEND_COOLDOWN_SEC);
      notify(
        isResend
          ? 'A new verification code has been sent.'
          : 'Verification code sent to your email.',
        'success'
      );
    } catch (err) {
      const { message, fieldErrors } = readError(
        err,
        'Unable to start the password change. Please try again.'
      );
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { _form: message });
      notify(message, 'error');
    } finally {
      setSubmitting(false);
      setResending(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await sendCode();
  };

  const handleConfirm = async (e) => {
    e.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      setErrors({ otp: 'Enter the 6-digit verification code' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const data = await confirmPasswordChange(otp);
      // Password changes rotate tokens — keep this session signed in
      if (data?.accessToken) setToken(data.accessToken);
      setStage('done');
      setForm(EMPTY_FORM);
      setOtp('');
      notify('Password updated successfully.', 'success');
    } catch (err) {
      const { message } = readError(err, 'Unable to update password. Please try again.');
      setErrors({ otp: message });
      notify(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStage('form');
    setForm(EMPTY_FORM);
    setOtp('');
    setErrors({});
    setCooldown(0);
  };

  const passwordField = (field, label, autoComplete, placeholder) => (
    <FormField label={label} htmlFor={field} error={errors[field]} required>
      <InputGroup>
        <InputIcon>
          <Lock size={16} />
        </InputIcon>
        <Input
          id={field}
          type={visible[field] ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="pl-10 pr-10"
          value={form[field]}
          onChange={setField(field)}
          error={Boolean(errors[field])}
          disabled={submitting}
        />
        <InputToggle
          label={visible[field] ? 'Hide password' : 'Show password'}
          onClick={toggle(field)}
        >
          {visible[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </InputToggle>
      </InputGroup>
    </FormField>
  );

  if (stage === 'done') {
    return (
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-success-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-1">Password updated</h3>
            <p className="text-body text-xs">
              Your password was changed successfully. Use it the next time you sign in.
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={reset}>
          Change password again
        </Button>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Mail size={18} className="text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-1">Confirm your password change</h3>
            <p className="text-body text-xs">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-ink">{user?.email}</span>. It expires in 10 minutes
              and can only be used once.
            </p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 max-w-sm" noValidate>
          {errors.otp && (
            <p className="text-xs text-danger-600" role="alert">
              {errors.otp}
            </p>
          )}

          <OtpInput
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (errors.otp) setErrors({});
            }}
            length={OTP_LENGTH}
            disabled={submitting}
            error={Boolean(errors.otp)}
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || otp.length !== OTP_LENGTH}
            >
              {submitting ? 'Updating…' : 'Confirm and update'}
            </Button>
            <button
              type="button"
              onClick={() => sendCode({ isResend: true })}
              disabled={cooldown > 0 || resending || submitting}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-muted disabled:pointer-events-none transition-colors"
            >
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={submitting}
              className="text-sm font-medium text-body hover:text-ink disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-brand-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-ink mb-1">Change password</h3>
          <p className="text-body text-xs">
            For your security, we email a verification code to confirm the change before it is
            applied.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitForm} className="space-y-4 max-w-sm" noValidate>
        {errors._form && (
          <p
            className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
            role="alert"
          >
            {errors._form}
          </p>
        )}

        {passwordField('currentPassword', 'Current password', 'current-password', '••••••••')}
        {passwordField('newPassword', 'New password', 'new-password', 'Min. 8 characters')}
        {passwordField('confirmPassword', 'Confirm password', 'new-password', 'Repeat password')}

        <p className="text-xs text-muted">
          Use at least 8 characters with uppercase, lowercase, and a number.
        </p>

        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Sending code…' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
