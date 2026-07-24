'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GuestGuard from '@/components/GuestGuard';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  Input,
  FormField,
  InputGroup,
  InputIcon,
  InputToggle,
} from '@/components/ui/Input';
import { logoutUser, resetPassword } from '@/lib/auth-api';
import { ApiError, fieldErrorsToMap, setToken } from '@/lib/api';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (!PASSWORD_RULE.test(password)) {
      next.password = 'Password must contain uppercase, lowercase, and a number';
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await resetPassword(token, password);
      // Discard session tokens issued by reset — user must sign in again
      setToken(null);
      try {
        await logoutUser();
      } catch {
        // Cookie clear may fail; hard redirect still drops in-memory session
      }
      setDone(true);
      setTimeout(() => {
        window.location.assign('/login?reset=success');
      }, 1400);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = fieldErrorsToMap(err.errors);
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        else setErrors({ _form: err.message || 'Invalid or expired reset link.' });
      } else {
        setErrors({ _form: 'Unable to reset password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-body text-sm">
          This reset link is invalid or has expired. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mx-auto">
          <CheckCircle size={24} className="text-success-600" aria-hidden="true" />
        </div>
        <p className="font-semibold text-ink">Password updated successfully</p>
        <p className="text-sm text-body">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {errors._form && (
        <p
          className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
          role="alert"
        >
          {errors._form}
        </p>
      )}

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
        {loading ? 'Updating…' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <GuestGuard allowAuthenticated>
      <AuthLayout
        title="Set new password"
        subtitle="Choose a strong password for your account"
      >
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </AuthLayout>
    </GuestGuard>
  );
}
