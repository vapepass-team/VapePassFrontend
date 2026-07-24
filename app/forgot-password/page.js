'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GuestGuard from '@/components/GuestGuard';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import OtpInput from '@/components/ui/OtpInput';
import {
  Input,
  FormField,
  InputGroup,
  InputIcon,
  InputToggle,
} from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import {
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  logoutUser,
} from '@/lib/auth-api';
import { ApiError, fieldErrorsToMap, setToken } from '@/lib/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', DONE: 'done' };

function ForgotPasswordFlow() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  // Settings can hand off mid-flow after it has already emailed a code
  const resumeAtOtp = searchParams.get('step') === 'otp';

  const [step, setStep] = useState(resumeAtOtp ? STEPS.OTP : STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const backHref = isAuthenticated ? '/settings?tab=security' : '/login';
  const backLabel = isAuthenticated ? 'Back to security settings' : 'Back to sign in';

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  // Resuming at the OTP step only works when we know which address was used
  useEffect(() => {
    if (!resumeAtOtp || authLoading) return;
    if (!user?.email) setStep((current) => (current === STEPS.OTP ? STEPS.EMAIL : current));
  }, [resumeAtOtp, authLoading, user?.email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const readError = (err, fallback) => {
    if (err instanceof ApiError) {
      const fieldErrors = fieldErrorsToMap(err.errors);
      return fieldErrors.email || fieldErrors.otp || fieldErrors.password || err.message;
    }
    return fallback;
  };

  const sendCode = async ({ isResend = false } = {}) => {
    const trimmed = email.trim();

    if (!trimmed) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setErrors({ email: 'Enter a valid email address' });
      return;
    }

    setErrors({});
    setInfo('');
    if (isResend) setResending(true);
    else setLoading(true);

    try {
      await forgotPassword(trimmed);
      setStep(STEPS.OTP);
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SEC);
      setInfo(
        isResend
          ? 'A new verification code has been sent.'
          : 'Verification code sent successfully. Check your inbox.'
      );
    } catch (err) {
      setErrors({ _form: readError(err, 'Unable to send verification code. Please try again.') });
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      setErrors({ otp: 'Enter the 6-digit verification code' });
      return;
    }

    setErrors({});
    setInfo('');
    setLoading(true);

    try {
      const data = await verifyPasswordResetOtp(email.trim(), otp);
      setResetToken(data.resetToken);
      setStep(STEPS.PASSWORD);
    } catch (err) {
      setErrors({ otp: readError(err, 'Unable to verify code. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();

    const next = {};
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (!PASSWORD_RULE.test(password)) {
      next.password = 'Password must contain uppercase, lowercase, and a number';
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);

    try {
      await resetPassword(resetToken, password);
      // Discard session tokens issued by reset — the user signs in again
      setToken(null);
      try {
        await logoutUser();
      } catch {
        // Cookie clear may fail; the hard redirect still drops the session
      }
      setStep(STEPS.DONE);
      setTimeout(() => {
        window.location.assign('/login?reset=success');
      }, 1600);
    } catch (err) {
      setErrors({ _form: readError(err, 'Unable to reset password. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const formAlert = errors._form && (
    <p
      className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
      role="alert"
    >
      {errors._form}
    </p>
  );

  const infoAlert = info && (
    <p
      className="text-sm text-success-700 bg-success-50 border border-green-200 rounded-xl px-4 py-3"
      role="status"
    >
      {info}
    </p>
  );

  if (step === STEPS.DONE) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mx-auto">
            <CheckCircle size={24} className="text-success-600" aria-hidden="true" />
          </div>
          <p className="font-semibold text-ink">Password updated successfully</p>
          <p className="text-sm text-body">Redirecting you to sign in…</p>
        </div>
      </AuthLayout>
    );
  }

  if (step === STEPS.PASSWORD) {
    return (
      <AuthLayout title="Set new password" subtitle="Choose a strong password for your account">
        <form onSubmit={handleSetPassword} className="space-y-5" noValidate>
          {formAlert}

          <FormField label="New password" htmlFor="password" error={errors.password} required>
            <InputGroup>
              <InputIcon>
                <Lock size={16} />
              </InputIcon>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={Boolean(errors.password)}
                disabled={loading}
              />
              <InputToggle
                label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </InputToggle>
            </InputGroup>
          </FormField>

          <FormField
            label="Confirm password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword}
            required
          >
            <InputGroup>
              <InputIcon>
                <Lock size={16} />
              </InputIcon>
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={Boolean(errors.confirmPassword)}
                disabled={loading}
              />
              <InputToggle
                label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </InputToggle>
            </InputGroup>
          </FormField>

          <p className="text-xs text-muted -mt-2">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === STEPS.OTP) {
    return (
      <AuthLayout title="Enter verification code" subtitle="Confirm it's you to reset your password">
        <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <Mail size={24} className="text-brand-600" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-ink">{email}</span>. The code expires in 10 minutes.
            </p>
          </div>

          {infoAlert}
          {formAlert}

          {errors.otp && (
            <p
              className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
              role="alert"
            >
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
            disabled={loading}
            error={Boolean(errors.otp)}
            autoFocus
          />

          <Button type="submit" className="w-full" disabled={loading || otp.length !== OTP_LENGTH}>
            {loading ? 'Verifying…' : 'Verify code'}
          </Button>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={() => sendCode({ isResend: true })}
              disabled={cooldown > 0 || resending}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-muted disabled:pointer-events-none transition-colors"
            >
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : 'Resend verification code'}
            </button>

            <p className="text-sm text-body">
              <button
                type="button"
                onClick={() => {
                  setStep(STEPS.EMAIL);
                  setOtp('');
                  setErrors({});
                  setInfo('');
                }}
                className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft size={14} /> Use a different email
              </button>
            </p>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a verification code"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendCode();
        }}
        className="space-y-5"
        noValidate
      >
        {formAlert}

        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <InputGroup>
            <InputIcon>
              <Mail size={16} />
            </InputIcon>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@store.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(errors.email)}
              disabled={loading}
              readOnly={Boolean(isAuthenticated && user?.email)}
            />
          </InputGroup>
        </FormField>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send verification code'}
        </Button>

        <p className="text-center text-sm text-body">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft size={14} /> {backLabel}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPassword() {
  return (
    <GuestGuard allowAuthenticated>
      <Suspense
        fallback={
          <AuthLayout title="Forgot password?" subtitle="Loading…">
            <div className="flex justify-center py-6">
              <Spinner size="lg" />
            </div>
          </AuthLayout>
        }
      >
        <ForgotPasswordFlow />
      </Suspense>
    </GuestGuard>
  );
}
